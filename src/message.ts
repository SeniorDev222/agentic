import type { Jsonifiable } from 'type-fest'

import { cleanStringForModel, stringifyForModel } from './utils.js'

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

  /**
   * The tool calls generated by the model, such as function calls.
   */
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

/** Narrowed OpenAI Message types. */
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

/** Utility functions for creating and checking message types. */
export namespace Msg {
  /** Create a system message. Cleans indentation and newlines by default. */
  export function system(
    content: string,
    opts?: {
      /** Custom name for the message. */
      name?: string
      /** Whether to clean extra newlines and indentation. Defaults to true. */
      cleanContent?: boolean
    }
  ): Msg.System {
    const { name, cleanContent = true } = opts ?? {}
    return {
      role: 'system',
      content: cleanContent ? cleanStringForModel(content) : content,
      ...(name ? { name } : {})
    }
  }

  /** Create a user message. Cleans indentation and newlines by default. */
  export function user(
    content: string,
    opts?: {
      /** Custom name for the message. */
      name?: string
      /** Whether to clean extra newlines and indentation. Defaults to true. */
      cleanContent?: boolean
    }
  ): Msg.User {
    const { name, cleanContent = true } = opts ?? {}
    return {
      role: 'user',
      content: cleanContent ? cleanStringForModel(content) : content,
      ...(name ? { name } : {})
    }
  }

  /** Create an assistant message. Cleans indentation and newlines by default. */
  export function assistant(
    content: string,
    opts?: {
      /** Custom name for the message. */
      name?: string
      /** Whether to clean extra newlines and indentation. Defaults to true. */
      cleanContent?: boolean
    }
  ): Msg.Assistant {
    const { name, cleanContent = true } = opts ?? {}
    return {
      role: 'assistant',
      content: cleanContent ? cleanStringForModel(content) : content,
      ...(name ? { name } : {})
    }
  }

  /** Create a function call message with argumets. */
  export function funcCall(
    function_call: {
      /** Name of the function to call. */
      name: string
      /** Arguments to pass to the function. */
      arguments: string
    },
    opts?: {
      /** The name descriptor for the message.(message.name) */
      name?: string
    }
  ): Msg.FuncCall {
    return {
      ...opts,
      role: 'assistant',
      content: null,
      function_call
    }
  }

  /** Create a function result message. */
  export function funcResult(
    content: Jsonifiable,
    name: string
  ): Msg.FuncResult {
    const contentString = stringifyForModel(content)
    return { role: 'function', content: contentString, name }
  }

  /** Create a function call message with argumets. */
  export function toolCall(
    tool_calls: Msg.Call.Tool[],
    opts?: {
      /** The name descriptor for the message.(message.name) */
      name?: string
    }
  ): Msg.ToolCall {
    return {
      ...opts,
      role: 'assistant',
      content: null,
      tool_calls
    }
  }

  /** Create a tool call result message. */
  export function toolResult(
    content: Jsonifiable,
    tool_call_id: string,
    opts?: {
      /** The name of the tool which was called */
      name?: string
    }
  ): Msg.ToolResult {
    const contentString = stringifyForModel(content)
    return { ...opts, role: 'tool', tool_call_id, content: contentString }
  }

  /** Get the narrowed message from an EnrichedResponse. */
  export function getMessage(
    // @TODO
    response: any
    // response: ChatModel.EnrichedResponse
  ): Msg.Assistant | Msg.FuncCall | Msg.ToolCall {
    const msg = response.choices[0].message as Msg
    return narrowResponseMessage(msg)
  }

  /** Narrow a message received from the API. It only responds with role=assistant */
  export function narrowResponseMessage(
    msg: Msg
  ): Msg.Assistant | Msg.FuncCall | Msg.ToolCall {
    if (msg.content === null && msg.tool_calls != null) {
      return Msg.toolCall(msg.tool_calls)
    } else if (msg.content === null && msg.function_call != null) {
      return Msg.funcCall(msg.function_call)
    } else if (msg.content !== null) {
      return Msg.assistant(msg.content)
    } else {
      // @TODO: probably don't want to error here
      console.log('Invalid message', msg)
      throw new Error('Invalid message')
    }
  }

  /** Check if a message is a system message. */
  export function isSystem(message: Msg): message is Msg.System {
    return message.role === 'system'
  }
  /** Check if a message is a user message. */
  export function isUser(message: Msg): message is Msg.User {
    return message.role === 'user'
  }
  /** Check if a message is an assistant message. */
  export function isAssistant(message: Msg): message is Msg.Assistant {
    return message.role === 'assistant' && message.content !== null
  }
  /** Check if a message is a function call message with arguments. */
  export function isFuncCall(message: Msg): message is Msg.FuncCall {
    return message.role === 'assistant' && message.function_call != null
  }
  /** Check if a message is a function result message. */
  export function isFuncResult(message: Msg): message is Msg.FuncResult {
    return message.role === 'function' && message.name != null
  }
  /** Check if a message is a tool calls message. */
  export function isToolCall(message: Msg): message is Msg.ToolCall {
    return message.role === 'assistant' && message.tool_calls != null
  }
  /** Check if a message is a tool call result message. */
  export function isToolResult(message: Msg): message is Msg.ToolResult {
    return message.role === 'tool' && !!message.tool_call_id
  }

  /** Narrow a ChatModel.Message to a specific type. */
  export function narrow(message: Msg.System): Msg.System
  export function narrow(message: Msg.User): Msg.User
  export function narrow(message: Msg.Assistant): Msg.Assistant
  export function narrow(message: Msg.FuncCall): Msg.FuncCall
  export function narrow(message: Msg.FuncResult): Msg.FuncResult
  export function narrow(message: Msg.ToolCall): Msg.ToolCall
  export function narrow(message: Msg.ToolResult): Msg.ToolResult
  export function narrow(
    message: Msg
  ):
    | Msg.System
    | Msg.User
    | Msg.Assistant
    | Msg.FuncCall
    | Msg.FuncResult
    | Msg.ToolCall
    | Msg.ToolResult {
    if (isSystem(message)) {
      return message
    }
    if (isUser(message)) {
      return message
    }
    if (isAssistant(message)) {
      return message
    }
    if (isFuncCall(message)) {
      return message
    }
    if (isFuncResult(message)) {
      return message
    }
    if (isToolCall(message)) {
      return message
    }
    if (isToolResult(message)) {
      return message
    }
    throw new Error('Invalid message type')
  }
}
