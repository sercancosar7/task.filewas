/**
 * Self-Healing System
 * Automatically analyzes test failures and generates fixes
 * @module @task-filewas/backend/orchestrator/self-healing
 */

import type {
  Agent,
  AgentType,
  ModelProvider,
} from '@task-filewas/shared'
import {
  spawnAgent,
  getAgent,
  type AgentSpawnOptions,
} from './agent-runner.js'
import {
  broadcastToSession,
  type WSMessage,
} from '../socket/index.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Test failure information
 */
export interface TestFailure {
  /** Test suite ID */
  suiteId: string
  /** Test scenario ID */
  scenarioId: string
  /** Test name/title */
  testName: string
  /** Error message */
  error: string
  /** Expected value */
  expected?: string
  /** Actual value */
  actual?: string
  /** Stack trace */
  stack?: string
  /** Screenshot path (if available) */
  screenshotPath?: string
  /** Timestamp of failure */
  timestamp: string
}

/**
 * Error analysis result
 */
export interface ErrorAnalysis {
  /** Root cause category */
  rootCause: ErrorRootCause
  /** Confidence score (0-1) */
  confidence: number
  /** Analysis explanation */
  explanation: string
  /** Suggested fix approach */
  suggestedFix: string
  /** Files likely involved */
  filesInvolved: string[]
  /** Whether auto-fix is possible */
  canAutoFix: boolean
}

/**
 * Error root cause categories
 */
export type ErrorRootCause =
  | 'selector_changed'      // Element selector changed
  | 'element_not_rendered'  // Component not rendering
  | 'timing_issue'          // Race condition or timing
  | 'api_error'             // Backend API failure
  | 'state_mismatch'        // Application state mismatch
  | 'missing_data'          // Required data missing
  | 'logic_error'           // Code logic bug
  | 'ui_layout_change'      // UI structure changed
  | 'network_error'         // Network connectivity issue
  | 'dependency_error'      // Missing/broken dependency
  | 'type_error'            // TypeScript type error
  | 'build_error'           // Build/compilation error
  | 'unknown'               // Cannot determine

/**
 * Generated fix plan
 */
export interface FixPlan {
  /** Unique fix plan ID */
  id: string
  /** Original failure that triggered this fix */
  failure: TestFailure
  /** Error analysis */
  analysis: ErrorAnalysis
  /** Fix steps to execute */
  steps: FixStep[]
  /** Model to use for fix generation */
  model: ModelProvider
  /** Estimated complexity */
  complexity: 'simple' | 'moderate' | 'complex'
}

/**
 * Single fix step
 */
export interface FixStep {
  /** Step order */
  order: number
  /** Step type */
  type: 'read' | 'edit' | 'write' | 'delete' | 'command' | 'analysis'
  /** Target file (if applicable) */
  targetFile?: string
  /** Description */
  description: string
  /** Command to run (if command type) */
  command?: string
  /** Expected outcome */
  expectedOutcome: string
}

/**
 * Fix application result
 */
export interface FixResult {
  /** Fix plan ID */
  fixPlanId: string
  /** Whether fix was successful */
  success: boolean
  /** Agent ID that applied the fix */
  agentId?: string
  /** Output from fix agent */
  output?: string
  /** Error if fix failed */
  error?: string
  /** Duration in milliseconds */
  duration: number
  /** Files modified */
  filesModified: string[]
}

/**
 * Self-healing configuration
 */
export interface SelfHealingConfig {
  /** Maximum fix attempts per failure */
  maxAttempts: number
  /** Model for error analysis (default: claude) */
  analysisModel: ModelProvider
  /** Model for fix generation (default: glm) */
  fixModel: ModelProvider
  /** Whether self-healing is enabled */
  enabled: boolean
  /** Timeout for fix agent (ms) */
  fixTimeout?: number
  /** Whether to escalate to CEO after max attempts */
  escalateAfterMaxAttempts: boolean
}

/**
 * Self-healing session state
 */
export interface SelfHealingSession {
  /** Session ID */
  sessionId: string
  /** Configuration */
  config: SelfHealingConfig
  /** Active fix attempts per failure key */
  attempts: Map<string, number>
  /** Fix history */
  history: FixResult[]
  /** Current state */
  state: 'idle' | 'analyzing' | 'fixing' | 'verifying' | 'completed' | 'failed'
}

// =============================================================================
// Constants
// =============================================================================

/** Default self-healing configuration */
const DEFAULT_CONFIG: SelfHealingConfig = {
  maxAttempts: 3,
  analysisModel: 'claude',
  fixModel: 'glm',
  enabled: true,
  fixTimeout: 180000, // 3 minutes
  escalateAfterMaxAttempts: true,
}

/** Debugger agent type for fixing issues */
const DEBUGGER_TYPE: AgentType = 'debugger'

// =============================================================================
// Self-Healing Class
// =============================================================================

/**
 * Self-healing system for automatic test failure recovery
 */
export class SelfHealing {
  private _session: SelfHealingSession

  /**
   * Create a new SelfHealing instance
   */
  constructor(sessionId: string, config: Partial<SelfHealingConfig> = {}) {
    this._session = {
      sessionId,
      config: { ...DEFAULT_CONFIG, ...config },
      attempts: new Map(),
      history: [],
      state: 'idle',
    }
  }

  // -------------------------------------------------------------------------
  // Public Properties
  // -------------------------------------------------------------------------

  /** Get session ID */
  get sessionId(): string {
    return this._session.sessionId
  }

  /** Get current state */
  get state(): SelfHealingSession['state'] {
    return this._session.state
  }

  /** Get configuration */
  get config(): SelfHealingConfig {
    return { ...this._session.config }
  }

  /** Get fix history */
  get history(): FixResult[] {
    return [...this._session.history]
  }

  /** Get attempt count for a specific failure */
  getAttemptCount(failureKey: string): number {
    return this._session.attempts.get(failureKey) || 0
  }

  // -------------------------------------------------------------------------
  // Main Self-Healing Flow
  // -------------------------------------------------------------------------

  /**
   * Process a test failure through self-healing
   */
  async processFailure(failure: TestFailure): Promise<FixResult> {
    const startTime = Date.now()
    const failureKey = this.getFailureKey(failure)

    // Check if self-healing is enabled
    if (!this._session.config.enabled) {
      return {
        fixPlanId: this.generateFixId(),
        success: false,
        error: 'Self-healing is disabled',
        duration: Date.now() - startTime,
        filesModified: [],
      }
    }

    // Check max attempts
    const currentAttempts = this._session.attempts.get(failureKey) || 0
    if (currentAttempts >= this._session.config.maxAttempts) {
      this.broadcastMaxAttemptsReached(failure, currentAttempts)

      if (this._session.config.escalateAfterMaxAttempts) {
        // Escalation will be handled by caller
        return {
          fixPlanId: this.generateFixId(),
          success: false,
          error: `Max attempts (${this._session.config.maxAttempts}) reached`,
          duration: Date.now() - startTime,
          filesModified: [],
        }
      }
    }

    this._session.state = 'analyzing'
    this.broadcastAnalysisStarted(failure)

    try {
      // Step 1: Analyze error
      const analysis = await this.analyzeError(failure)
      this.broadcastAnalysisComplete(failure, analysis)

      // Step 2: Generate fix plan
      this._session.state = 'fixing'
      const fixPlan = await this.generateFixPlan(failure, analysis)
      this.broadcastFixPlanGenerated(fixPlan)

      // Step 3: Apply fix
      const fixResult = await this.applyFix(fixPlan)

      // Increment attempts
      this._session.attempts.set(failureKey, currentAttempts + 1)

      // Record history
      this._session.history.push(fixResult)

      // Update state
      if (fixResult.success) {
        this._session.state = 'completed'
      } else {
        this._session.state = 'failed'
      }

      return fixResult
    } catch (error) {
      this._session.state = 'failed'
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.broadcastSelfHealingFailed(failure, errorMessage)

      return {
        fixPlanId: this.generateFixId(),
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        filesModified: [],
      }
    }
  }

  /**
   * Analyze a test failure to determine root cause
   */
  async analyzeError(failure: TestFailure): Promise<ErrorAnalysis> {
    const prompt = this.buildAnalysisPrompt(failure)

    // Use analysis model (claude for better reasoning)
    const spawnOptions: AgentSpawnOptions = {
      agentType: 'debugger',
      sessionId: this._session.sessionId,
      cwd: process.cwd(),
      prompt,
      dangerouslySkipPermissions: true,
      maxTurns: 3,
      timeout: 60000, // 1 minute for analysis
    }

    const agent = await spawnAgent(spawnOptions)
    const analysis = await this.waitForAnalysis(agent)

    // Parse analysis from agent output
    return this.parseAnalysisResult(analysis, failure)
  }

  /**
   * Generate a fix plan based on error analysis
   */
  async generateFixPlan(failure: TestFailure, analysis: ErrorAnalysis): Promise<FixPlan> {
    const prompt = this.buildFixPlanPrompt(failure, analysis)

    // Use fix model (glm for faster code generation)
    const spawnOptions: AgentSpawnOptions = {
      agentType: 'debugger',
      sessionId: this._session.sessionId,
      cwd: process.cwd(),
      prompt,
      dangerouslySkipPermissions: true,
      maxTurns: 5,
      ...(this._session.config.fixTimeout !== undefined && { timeout: this._session.config.fixTimeout }),
    }

    const agent = await spawnAgent(spawnOptions)
    const fixOutput = await this.waitForFixOutput(agent)

    return this.parseFixPlan(fixOutput, failure, analysis)
  }

  /**
   * Apply the fix plan using an agent
   */
  async applyFix(fixPlan: FixPlan): Promise<FixResult> {
    const startTime = Date.now()

    this.broadcastFixStarted(fixPlan)

    const prompt = this.buildApplyFixPrompt(fixPlan)

    const spawnOptions: AgentSpawnOptions = {
      agentType: DEBUGGER_TYPE,
      sessionId: this._session.sessionId,
      cwd: process.cwd(),
      prompt,
      dangerouslySkipPermissions: true,
      maxTurns: 10,
      ...(this._session.config.fixTimeout !== undefined && { timeout: this._session.config.fixTimeout }),
    }

    try {
      const agent = await spawnAgent(spawnOptions)
      const result = await this.waitForCompletion(agent.id)

      const duration = Date.now() - startTime
      const filesModified = this.extractModifiedFiles(result.output || '')

      const fixResult: FixResult = {
        fixPlanId: fixPlan.id,
        success: result.success,
        agentId: agent.id,
        output: result.output || '',
        error: result.error || '',
        duration,
        filesModified,
      }

      if (result.success) {
        this.broadcastFixSuccess(fixResult)
      } else {
        this.broadcastFixFailed(fixPlan, result.error || 'Unknown error')
      }

      return fixResult
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const fixResult: FixResult = {
        fixPlanId: fixPlan.id,
        success: false,
        error: errorMessage,
        duration,
        filesModified: [],
      }

      this.broadcastFixFailed(fixPlan, errorMessage)

      return fixResult
    }
  }

  /**
   * Verify that a fix was successful by re-running tests
   */
  async verifyFix(_fixResult: FixResult): Promise<boolean> {
    this._session.state = 'verifying'
    // Verification is handled externally by test runner
    // This method marks the state for external observers
    return true
  }

  /**
   * Reset the self-healing session
   */
  reset(): void {
    this._session.attempts.clear()
    this._session.history = []
    this._session.state = 'idle'
  }

  /**
   * Clear attempts for a specific failure
   */
  clearAttempts(failureKey: string): void {
    this._session.attempts.delete(failureKey)
  }

  // -------------------------------------------------------------------------
  // Prompt Building
  // -------------------------------------------------------------------------

  /**
   * Build prompt for error analysis
   */
  private buildAnalysisPrompt(failure: TestFailure): string {
    const sections: string[] = []

    sections.push('# Error Analysis Request')
    sections.push('')
    sections.push('A test has failed. Analyze the error and determine the root cause.')
    sections.push('')

    sections.push('## Test Failure Details')
    sections.push(`**Test:** ${failure.testName}`)
    sections.push(`**Suite:** ${failure.suiteId}`)
    sections.push(`**Scenario:** ${failure.scenarioId}`)
    sections.push(`**Timestamp:** ${failure.timestamp}`)
    sections.push('')

    sections.push('## Error Message')
    sections.push('```')
    sections.push(failure.error)
    sections.push('```')
    sections.push('')

    if (failure.expected) {
      sections.push('## Expected Value')
      sections.push('```')
      sections.push(failure.expected)
      sections.push('```')
      sections.push('')
    }

    if (failure.actual) {
      sections.push('## Actual Value')
      sections.push('```')
      sections.push(failure.actual)
      sections.push('```')
      sections.push('')
    }

    if (failure.stack) {
      sections.push('## Stack Trace')
      sections.push('```')
      sections.push(failure.stack.slice(0, 500)) // Limit stack trace
      sections.push('```')
      sections.push('')
    }

    sections.push('## Your Task')
    sections.push('')
    sections.push('Analyze this failure and provide:')
    sections.push('')
    sections.push('1. **Root Cause** - One of these categories:')
    sections.push('   - `selector_changed`: Element selector changed')
    sections.push('   - `element_not_rendered`: Component not rendering')
    sections.push('   - `timing_issue`: Race condition or timing problem')
    sections.push('   - `api_error`: Backend API failure')
    sections.push('   - `state_mismatch`: Application state mismatch')
    sections.push('   - `missing_data`: Required data missing')
    sections.push('   - `logic_error`: Code logic bug')
    sections.push('   - `ui_layout_change`: UI structure changed')
    sections.push('   - `network_error`: Network connectivity issue')
    sections.push('   - `dependency_error`: Missing/broken dependency')
    sections.push('   - `type_error`: TypeScript type error')
    sections.push('   - `build_error`: Build/compilation error')
    sections.push('   - `unknown`: Cannot determine')
    sections.push('')
    sections.push('2. **Confidence** - A number from 0 to 1 indicating your confidence')
    sections.push('')
    sections.push('3. **Explanation** - Brief explanation of why this error occurred')
    sections.push('')
    sections.push('4. **Suggested Fix** - High-level approach to fix this issue')
    sections.push('')
    sections.push('5. **Files Involved** - List of files that likely need to be modified')
    sections.push('')
    sections.push('6. **Can Auto-Fix** - Whether this can be automatically fixed (true/false)')
    sections.push('')
    sections.push('## Response Format')
    sections.push('')
    sections.push('Respond with a JSON object:')
    sections.push('```json')
    sections.push('{')
    sections.push('  "rootCause": "selector_changed",')
    sections.push('  "confidence": 0.85,')
    sections.push('  "explanation": "The button ID has changed from submit-btn to submit-button",')
    sections.push('  "suggestedFix": "Update the selector in the test file",')
    sections.push('  "filesInvolved": ["tests/e2e/login.spec.ts"],')
    sections.push('  "canAutoFix": true')
    sections.push('}')
    sections.push('```')
    sections.push('')

    return sections.join('\n')
  }

  /**
   * Build prompt for fix plan generation
   */
  private buildFixPlanPrompt(_failure: TestFailure, analysis: ErrorAnalysis): string {
    const sections: string[] = []

    sections.push('# Fix Plan Generation')
    sections.push('')
    sections.push('Based on the error analysis, generate a detailed fix plan.')
    sections.push('')

    sections.push('## Error Analysis')
    sections.push(`**Root Cause:** ${analysis.rootCause}`)
    sections.push(`**Confidence:** ${(analysis.confidence * 100).toFixed(0)}%`)
    sections.push(`**Explanation:** ${analysis.explanation}`)
    sections.push(`**Suggested Fix:** ${analysis.suggestedFix}`)
    sections.push('')

    sections.push('## Files to Modify')
    analysis.filesInvolved.forEach(file => {
      sections.push(`- ${file}`)
    })
    sections.push('')

    sections.push('## Your Task')
    sections.push('')
    sections.push('Generate a detailed fix plan with the following steps:')
    sections.push('')
    sections.push('1. **Read** the relevant files to understand current state')
    sections.push('2. **Edit** or **Write** the necessary changes')
    sections.push('3. **Command** to build/verify the changes if needed')
    sections.push('')
    sections.push('For each step, provide:')
    sections.push('- **order**: Step number (1, 2, 3...)')
    sections.push('- **type**: One of "read", "edit", "write", "delete", "command", "analysis"')
    sections.push('- **targetFile**: File path (if applicable)')
    sections.push('- **description**: What this step does')
    sections.push('- **command**: Command to run (if type is "command")')
    sections.push('- **expectedOutcome**: What should result from this step')
    sections.push('')

    sections.push('## Response Format')
    sections.push('')
    sections.push('Respond with a JSON object:')
    sections.push('```json')
    sections.push('{')
    sections.push('  "steps": [')
    sections.push('    {')
    sections.push('      "order": 1,')
    sections.push('      "type": "read",')
    sections.push('      "targetFile": "src/components/Login.tsx",')
    sections.push('      "description": "Read the login component to understand structure",')
    sections.push('      "expectedOutcome": "Component code loaded"')
    sections.push('    },')
    sections.push('    {')
    sections.push('      "order": 2,')
    sections.push('      "type": "edit",')
    sections.push('      "targetFile": "tests/e2e/login.spec.ts",')
    sections.push('      "description": "Update selector from #submit-btn to #submit-button",')
    sections.push('      "expectedOutcome": "Test file updated with correct selector"')
    sections.push('    }')
    sections.push('  ]')
    sections.push('}')
    sections.push('```')
    sections.push('')

    return sections.join('\n')
  }

  /**
   * Build prompt for applying the fix
   */
  private buildApplyFixPrompt(fixPlan: FixPlan): string {
    const sections: string[] = []

    sections.push('# Apply Fix')
    sections.push('')
    sections.push('Execute the following fix plan to resolve the test failure.')
    sections.push('')

    sections.push('## Fix Steps')
    fixPlan.steps.forEach((step) => {
      sections.push(`### Step ${step.order}`)
      sections.push(`**Type:** ${step.type}`)
      if (step.targetFile) {
        sections.push(`**File:** ${step.targetFile}`)
      }
      if (step.command) {
        sections.push(`**Command:** \`${step.command}\``)
      }
      sections.push(`**Description:** ${step.description}`)
      sections.push(`**Expected:** ${step.expectedOutcome}`)
      sections.push('')
    })

    sections.push('## Instructions')
    sections.push('')
    sections.push('1. Execute the steps in order')
    sections.push('2. Use the appropriate tools (Read, Edit, Write, Bash)')
    sections.push('3. If a step fails, analyze why and try an alternative approach')
    sections.push('4. After completing all steps, report the result')
    sections.push('')
    sections.push('**Important:**')
    sections.push('- Make minimal changes to fix the specific issue')
    sections.push('- Preserve existing code style and patterns')
    sections.push('- Do not modify unrelated code')
    sections.push('- If you cannot complete the fix, explain why')
    sections.push('')

    return sections.join('\n')
  }

  // -------------------------------------------------------------------------
  // Result Parsing
  // -------------------------------------------------------------------------

  /**
   * Parse analysis result from agent output
   */
  private parseAnalysisResult(output: string, failure: TestFailure): ErrorAnalysis {
    try {
      // Try to extract JSON from output
      const jsonMatch = output.match(/```json\s*?\n?([\s\S]*?)\n?```/) ||
                       output.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])

        return {
          rootCause: parsed.rootCause || 'unknown',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
          explanation: parsed.explanation || 'No explanation provided',
          suggestedFix: parsed.suggestedFix || '',
          filesInvolved: Array.isArray(parsed.filesInvolved) ? parsed.filesInvolved : [],
          canAutoFix: parsed.canAutoFix === true,
        }
      }
    } catch {
      // JSON parsing failed, use default analysis
    }

    // Fallback: analyze from error message
    return this.fallbackAnalysis(failure)
  }

  /**
   * Parse fix plan from agent output
   */
  private parseFixPlan(output: string, failure: TestFailure, analysis: ErrorAnalysis): FixPlan {
    try {
      const jsonMatch = output.match(/```json\s*?\n?([\s\S]*?)\n?```/) ||
                       output.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
        const steps = Array.isArray(parsed.steps) ? parsed.steps : []

        return {
          id: this.generateFixId(),
          failure,
          analysis,
          steps: steps.map((s: any) => ({
            order: s.order || 0,
            type: s.type || 'analysis',
            targetFile: s.targetFile,
            description: s.description || '',
            command: s.command,
            expectedOutcome: s.expectedOutcome || '',
          })),
          model: this._session.config.fixModel,
          complexity: this.estimateComplexity(steps),
        }
      }
    } catch {
      // JSON parsing failed
    }

    // Fallback: generate simple fix plan
    return {
      id: this.generateFixId(),
      failure,
      analysis,
      steps: [{
        order: 1,
        type: 'analysis',
        description: analysis.suggestedFix || 'Investigate and fix the issue',
        expectedOutcome: 'Issue resolved',
      }],
      model: this._session.config.fixModel,
      complexity: 'moderate',
    }
  }

  /**
   * Extract modified files from agent output
   */
  private extractModifiedFiles(output: string): string[] {
    const files: string[] = []

    // Look for file edit patterns
    const editPatterns = [
      /Edited: ([^\n]+)/g,
      /Modified: ([^\n]+)/g,
      /Updated: ([^\n]+)/g,
      /Wrote: ([^\n]+)/g,
    ]

    for (const pattern of editPatterns) {
      let match
      while ((match = pattern.exec(output)) !== null) {
        const file = match[1]?.trim()
        if (file && !files.includes(file)) {
          files.push(file)
        }
      }
    }

    return files
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Generate unique fix ID
   */
  private generateFixId(): string {
    return `fix-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  /**
   * Generate failure key for tracking attempts
   */
  private getFailureKey(failure: TestFailure): string {
    return `${failure.suiteId}:${failure.scenarioId}`
  }

  /**
   * Fallback analysis when JSON parsing fails
   */
  private fallbackAnalysis(failure: TestFailure): ErrorAnalysis {
    const error = failure.error.toLowerCase()
    let rootCause: ErrorRootCause = 'unknown'
    let canAutoFix = false

    // Heuristic analysis
    if (error.includes('selector') || error.includes('element') || error.includes('find')) {
      rootCause = 'selector_changed'
      canAutoFix = true
    } else if (error.includes('timeout') || error.includes('waiting')) {
      rootCause = 'timing_issue'
      canAutoFix = true
    } else if (error.includes('network') || error.includes('fetch') || error.includes('connection')) {
      rootCause = 'network_error'
      canAutoFix = false
    } else if (error.includes('api') || error.includes('endpoint')) {
      rootCause = 'api_error'
      canAutoFix = true
    } else if (error.includes('type') || error.includes('typescript')) {
      rootCause = 'type_error'
      canAutoFix = true
    } else if (error.includes('build') || error.includes('compile')) {
      rootCause = 'build_error'
      canAutoFix = true
    } else if (error.includes('undefined') || error.includes('null')) {
      rootCause = 'missing_data'
      canAutoFix = true
    } else if (error.includes('dependency') || error.includes('module')) {
      rootCause = 'dependency_error'
      canAutoFix = true
    }

    return {
      rootCause,
      confidence: 0.5,
      explanation: 'Heuristic analysis based on error message patterns',
      suggestedFix: 'Review the error and apply appropriate fix',
      filesInvolved: [],
      canAutoFix,
    }
  }

  /**
   * Estimate fix complexity
   */
  private estimateComplexity(steps: unknown[]): 'simple' | 'moderate' | 'complex' {
    const count = steps.length
    if (count <= 2) return 'simple'
    if (count <= 5) return 'moderate'
    return 'complex'
  }

  /**
   * Wait for agent to complete and return output
   */
  private async waitForCompletion(agentId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const timeout = this._session.config.fixTimeout || 180000
      const timeoutHandle = setTimeout(() => {
        cleanup()
        resolve({
          success: false,
          error: `Agent timeout after ${timeout}ms`,
        })
      }, timeout)

      const checkInterval = setInterval(() => {
        const agent = getAgent(agentId)

        if (!agent) {
          cleanup()
          resolve({
            success: false,
            error: 'Agent disappeared',
          })
          return
        }

        if (agent.status === 'completed') {
          cleanup()
          resolve({
            success: true,
            output: agent.currentAction || 'Fix completed',
          })
        } else if (agent.status === 'error') {
          cleanup()
          resolve({
            success: false,
            error: agent.errorMessage || 'Agent failed',
          })
        }
      }, 500)

      function cleanup() {
        clearTimeout(timeoutHandle)
        clearInterval(checkInterval)
      }
    })
  }

  /**
   * Wait for analysis result
   */
  private async waitForAnalysis(agent: Agent): Promise<string> {
    const result = await this.waitForCompletion(agent.id)
    return result.output || result.error || ''
  }

  /**
   * Wait for fix output
   */
  private async waitForFixOutput(agent: Agent): Promise<string> {
    const result = await this.waitForCompletion(agent.id)
    return result.output || result.error || ''
  }

  // -------------------------------------------------------------------------
  // WebSocket Broadcasting
  // -------------------------------------------------------------------------

  /**
   * Broadcast analysis started event
   */
  private broadcastAnalysisStarted(failure: TestFailure): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:analysis_started',
      payload: {
        sessionId: this._session.sessionId,
        testName: failure.testName,
        error: failure.error,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast analysis complete event
   */
  private broadcastAnalysisComplete(failure: TestFailure, analysis: ErrorAnalysis): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:analysis_complete',
      payload: {
        sessionId: this._session.sessionId,
        testName: failure.testName,
        rootCause: analysis.rootCause,
        confidence: analysis.confidence,
        canAutoFix: analysis.canAutoFix,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast fix plan generated event
   */
  private broadcastFixPlanGenerated(fixPlan: FixPlan): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:fix_plan_generated',
      payload: {
        sessionId: this._session.sessionId,
        fixPlanId: fixPlan.id,
        stepCount: fixPlan.steps.length,
        complexity: fixPlan.complexity,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast fix started event
   */
  private broadcastFixStarted(fixPlan: FixPlan): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:fix_started',
      payload: {
        sessionId: this._session.sessionId,
        fixPlanId: fixPlan.id,
        stepCount: fixPlan.steps.length,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast fix success event
   */
  private broadcastFixSuccess(result: FixResult): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:fix_success',
      payload: {
        sessionId: this._session.sessionId,
        fixPlanId: result.fixPlanId,
        agentId: result.agentId,
        filesModified: result.filesModified,
        duration: result.duration,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast fix failed event
   */
  private broadcastFixFailed(fixPlan: FixPlan, error: string): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:fix_failed',
      payload: {
        sessionId: this._session.sessionId,
        fixPlanId: fixPlan.id,
        error,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast max attempts reached event
   */
  private broadcastMaxAttemptsReached(failure: TestFailure, attempts: number): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:max_attempts_reached',
      payload: {
        sessionId: this._session.sessionId,
        testName: failure.testName,
        attempts,
        maxAttempts: this._session.config.maxAttempts,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  /**
   * Broadcast self-healing failed event
   */
  private broadcastSelfHealingFailed(failure: TestFailure, error: string): void {
    const wsMessage: WSMessage = {
      type: 'status',
      event: 'self-healing:failed',
      payload: {
        sessionId: this._session.sessionId,
        testName: failure.testName,
        error,
      },
      timestamp: new Date().toISOString(),
    }
    broadcastToSession(this._session.sessionId, wsMessage)
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /**
   * Get self-healing statistics
   */
  getStats(): {
    totalAttempts: number
    successfulFixes: number
    failedFixes: number
    activeFailures: number
    config: SelfHealingConfig
  } {
    const successfulFixes = this._session.history.filter(h => h.success).length
    const failedFixes = this._session.history.filter(h => !h.success).length
    const activeFailures = this._session.attempts.size

    return {
      totalAttempts: this._session.history.length,
      successfulFixes,
      failedFixes,
      activeFailures,
      config: this._session.config,
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Global self-healing sessions per session
 */
const globalSelfHealingSessions = new Map<string, SelfHealing>()

/**
 * Create or get self-healing for a session
 */
export function getSelfHealing(
  sessionId: string,
  config?: Partial<SelfHealingConfig>
): SelfHealing {
  let healing = globalSelfHealingSessions.get(sessionId)

  if (!healing) {
    healing = new SelfHealing(sessionId, config)
    globalSelfHealingSessions.set(sessionId, healing)
  } else if (config) {
    // Config updates require creating new instance (immutable)
    healing = new SelfHealing(sessionId, config)
    globalSelfHealingSessions.set(sessionId, healing)
  }

  return healing
}

/**
 * Remove self-healing for a session
 */
export function removeSelfHealing(sessionId: string): boolean {
  return globalSelfHealingSessions.delete(sessionId)
}

/**
 * Clear all self-healing sessions
 */
export function clearAllSelfHealing(): void {
  globalSelfHealingSessions.clear()
}

/**
 * Get all active self-healing sessions
 */
export function getAllSelfHealingSessions(): SelfHealing[] {
  return Array.from(globalSelfHealingSessions.values())
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  SelfHealing,
  getSelfHealing,
  removeSelfHealing,
  clearAllSelfHealing,
  getAllSelfHealingSessions,
}
