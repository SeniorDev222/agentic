#!/usr/bin/env node
import 'dotenv/config'

import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'

import { WeatherClient } from '../../src/index.js'
import { createLangChainTools } from '../../src/sdks/langchain.js'

async function main() {
  const weather = new WeatherClient()

  const tools = createLangChainTools(weather)
  const agent = createToolCallingAgent({
    llm: new ChatOpenAI({ model: 'gpt-4o', temperature: 0 }),
    tools,
    prompt: ChatPromptTemplate.fromMessages([
      ['system', 'You are a weather assistant. Be as concise as possible.'],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}']
    ])
  })

  const agentExecutor = new AgentExecutor({
    agent,
    tools
    // verbose: true
  })

  const result = await agentExecutor.invoke({
    input: 'What is the weather in San Francisco?'
  })

  console.log(result.output)
}

await main()
