//
// CargoTrack — Bedrock LLM Provider
//
// Wraps @aws-sdk/client-bedrock-runtime Converse API into the unified
// LLMProvider interface. Supports tool-use (multi-turn agent loop)
// and single-turn completions.
//
// Model: Amazon Nova Lite/Pro via the Converse API (not InvokeModel).
//

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
  type Message as BedrockMessage,
  type ContentBlock,
  type Tool as BedrockTool,
  type ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMMessage,
  LLMToolCall,
} from './provider';

export class BedrockProvider implements LLMProvider {
  readonly providerName = 'bedrock';
  readonly modelId: string;
  private client: BedrockRuntimeClient;

  constructor(region: string, modelId: string) {
    this.modelId = modelId;
    this.client = new BedrockRuntimeClient({ region });
  }

  async chat(req: LLMRequest): Promise<LLMResponse> {
    const messages = req.messages.map(toBedrockMessage);

    const tools: BedrockTool[] | undefined = req.tools?.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: { json: t.inputSchema as any },
      },
    }));

    // 90s hard timeout on the Bedrock SDK call — must fire before the
    // 110s AbortController in core-service/src/routes/copilot.ts so the
    // ai-service returns a proper error instead of the proxy sending 504.
    const abortController = new AbortController();
    const bedrockTimeout = setTimeout(() => abortController.abort(), 90_000);

    let response: ConverseCommandOutput;
    const t0 = Date.now();
    console.log(`[bedrock] → ConverseCommand model=${this.modelId} maxTokens=${req.maxTokens ?? 4096}`);
    try {
      response = await this.client.send(
        new ConverseCommand({
          modelId: this.modelId,
          system: [{ text: req.system }],
          messages,
          ...(tools ? { toolConfig: { tools } } : {}),
          inferenceConfig: {
            maxTokens: req.maxTokens ?? 4096,
            temperature: req.temperature ?? 0.2,
          },
        }),
        { abortSignal: abortController.signal }
      );
      console.log(`[bedrock] ← OK stopReason=${response.stopReason} in ${Date.now() - t0}ms`);
    } catch (err: any) {
      console.error(`[bedrock] ✗ ${err.name}: ${err.message?.slice(0, 120)} (${Date.now() - t0}ms)`);
      throw err;
    } finally {
      clearTimeout(bedrockTimeout);
    }

    const stopReason = response.stopReason;
    const content = response.output?.message?.content ?? [];
    const usage = response.usage;

    // Extract plain text
    const textBlock = content.find((b) => 'text' in b);
    const text = textBlock && 'text' in textBlock ? textBlock.text : undefined;

    // Extract tool calls
    const toolCalls: LLMToolCall[] = content
      .filter((b) => 'toolUse' in b)
      .map((b) => {
        const tu = (b as any).toolUse;
        return { id: tu.toolUseId!, name: tu.name!, input: tu.input as Record<string, unknown> };
      });

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: stopReason === 'tool_use' ? 'tool_use' : 'end_turn',
      modelId: this.modelId,
      usage: {
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
      },
    };
  }
}

// ─── Format conversion helpers ────────────────────────────────────────────────

function toBedrockMessage(msg: LLMMessage): BedrockMessage {
  if (msg.role === 'user') {
    // User message may be text OR tool results
    if (msg.toolResults && msg.toolResults.length > 0) {
      const content: ContentBlock[] = msg.toolResults.map((tr) => ({
        toolResult: {
          toolUseId: tr.toolCallId,
          content: [{ json: tr.content as Record<string, unknown> } as ToolResultContentBlock],
        },
      })) as ContentBlock[];
      return { role: 'user', content };
    }
    return { role: 'user', content: [{ text: msg.text ?? '' }] };
  }

  // Assistant message may be text OR tool calls
  if (msg.toolCalls && msg.toolCalls.length > 0) {
    const content: ContentBlock[] = msg.toolCalls.map((tc) => ({
      toolUse: { toolUseId: tc.id, name: tc.name, input: tc.input },
    })) as ContentBlock[];
    if (msg.text) content.unshift({ text: msg.text });
    return { role: 'assistant', content };
  }

  return { role: 'assistant', content: [{ text: msg.text ?? '' }] };
}
