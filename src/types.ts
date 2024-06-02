import type { Jsonifiable } from 'type-fest'
import type { z } from 'zod'

export type { KyInstance } from 'ky'
export type { ThrottledFunction } from 'p-throttle'

// TODO
export type DeepNullable<T> = T | null

export type MaybePromise<T> = T | Promise<T>

export type RelaxedJsonifiable = Jsonifiable | Record<string, Jsonifiable>

export interface AIFunctionSpec {
  name: string
  description?: string
  parameters: Record<string, unknown>
}

export interface AIToolSpec {
  type: 'function'
  function: AIFunctionSpec
}

/** The implementation of the function, with arg parsing and validation. */
export type AIFunctionImpl<Return> = Omit<
  (input: string | Msg) => MaybePromise<Return>,
  'name' | 'toString' | 'arguments' | 'caller' | 'prototype' | 'length'
>

/**
 * A function meant to be used with LLM function calling.
 */
export interface AIFunction<
  InputSchema extends z.ZodObject<any> = z.ZodObject<any>,
  Return = any
> extends AIFunctionImpl<Return> {
  /** The Zod schema for the arguments string. */
  inputSchema: InputSchema

  /** Parse the function arguments from a message. */
  parseInput(input: string | Msg): z.infer<InputSchema>

  /** The function spec for the OpenAI API `functions` property. */
  spec: AIFunctionSpec

  /** The underlying function implementation without any arg parsing or validation. */
  impl: (params: z.infer<InputSchema>) => MaybePromise<Return>
}

/**
 * A tool meant to be used with LLM function calling.
 */
export interface AITool<
  InputSchema extends z.ZodObject<any> = z.ZodObject<any>,
  Return = any
> {
  function: AIFunction<InputSchema, Return>

  /** The tool spec for the OpenAI API `tools` property. */
  spec: AIToolSpec
}

/**
 * Generic/default OpenAI message without any narrowing applied.
 */
export interface Msg {
  /**
   * The contents of the message. `content` is required for all messages, and
   * may be null for assistant messages with function calls.
   */
  content: string | null

  /**
   * The role of the messages author. One of `system`, `user`, `assistant`,
   * 'tool', or `function`.
   */
  role: Msg.Role

  /**
   * The name and arguments of a function that should be called, as generated
   * by the model.
   */
  function_call?: Msg.Call.Function

  /** The tool calls generated by the model, such as function calls. */
  tool_calls?: Msg.Call.Tool[]

  /**
   * Tool call that this message is responding to.
   */
  tool_call_id?: string

  /**
   * The name of the author of this message. `name` is required if role is
   * `function`, and it should be the name of the function whose response is in the
   * `content`. May contain a-z, A-Z, 0-9, and underscores, with a maximum length of
   * 64 characters.
   */
  name?: string
}

/** Narrowed Message types. */
export namespace Msg {
  /** Possible roles for a message. */
  export type Role = 'system' | 'user' | 'assistant' | 'function' | 'tool'

  export namespace Call {
    /**
     * The name and arguments of a function that should be called, as generated
     * by the model.
     */
    export type Function = {
      /**
       * The arguments to call the function with, as generated by the model in
       * JSON format.
       */
      arguments: string

      /** The name of the function to call. */
      name: string
    }

    /** The tool calls generated by the model, such as function calls. */
    export type Tool = {
      /** The ID of the tool call. */
      id: string

      /** The type of the tool. Currently, only `function` is supported. */
      type: 'function'

      /** The function that the model called. */
      function: Call.Function
    }
  }

  /** Message with text content for the system. */
  export type System = {
    role: 'system'
    content: string
    name?: string
  }

  /** Message with text content from the user. */
  export type User = {
    role: 'user'
    name?: string
    content: string
  }

  /** Message with text content from the assistant. */
  export type Assistant = {
    role: 'assistant'
    name?: string
    content: string
  }

  /** Message with arguments to call a function. */
  export type FuncCall = {
    role: 'assistant'
    name?: string
    content: null
    function_call: Call.Function
  }

  /** Message with the result of a function call. */
  export type FuncResult = {
    role: 'function'
    name: string
    content: string
  }

  /** Message with arguments to call one or more tools. */
  export type ToolCall = {
    role: 'assistant'
    name?: string
    content: null
    tool_calls: Call.Tool[]
  }

  /** Message with the result of a tool call. */
  export type ToolResult = {
    role: 'tool'
    tool_call_id: string
    content: string
  }
}
