from langgraph.graph import StateGraph, START, END
import logging
from langchain_openai import ChatOpenAI
from typing import TypedDict
from typing_extensions import Annotated
import operator
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("QWEN_API_KEY")
base_url = os.getenv("QWEN_API_BASE_URL")
model_name = 'qwen-turbo'

llm = ChatOpenAI(model=model_name, api_key=api_key, base_url=base_url, temperature=0.7)

# langgraph 中的update模式只会返回节点中state更新的数据部分，而values是返回全局的state
class OverState(TypedDict):
    messages: Annotated[list[dict],operator.add]
    is_over: bool

def llm_response(state:OverState):
    logging.info(f"llm_response received state: {state['messages']}")
    response = llm.invoke(state['messages'])
    ai_response_content = response.content
    logging.info(f"llm_response received response: {ai_response_content}")
    return {'messages':[{'role':'assistant','content':ai_response_content}]}

def check_state(state:OverState):
    return { 'is_over': True }

graph_builder = StateGraph(OverState)

graph_builder.add_node("llm_response",llm_response)
graph_builder.add_node("check_state",check_state)

graph_builder.add_edge(START, "llm_response")
graph_builder.add_edge("llm_response", "check_state")
graph_builder.add_edge("check_state", END)

app = graph_builder.compile()