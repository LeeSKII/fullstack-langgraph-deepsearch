"""
搜索智能体的工作流定义
包含工作流的创建、编译和配置
"""

from langgraph.graph import StateGraph, START, END
from functools import partial

from .models import OverallState
from .nodes import (
    agent_router,
    clarify_with_user,
    analyze_need_web_search,
    generate_search_query,
    need_web_search,
    web_search,
    evaluate_search_results,
    assistant_node,
)


def create_workflow(llm, tavily_client, system_prompt):
    """创建并编译工作流"""
    
    # 创建图形
    workflow = StateGraph(OverallState)
    
    # 使用 partial 绑定依赖项
    agent_router_node = partial(agent_router, llm=llm, system_prompt=system_prompt)
    clarify_with_user_node = partial(clarify_with_user, llm=llm)
    analyze_need_web_search_node = partial(analyze_need_web_search, llm=llm, system_prompt=system_prompt)
    generate_search_query_node = partial(generate_search_query, llm=llm, system_prompt=system_prompt)
    web_search_node = partial(web_search, tavily_client=tavily_client)
    evaluate_search_results_node = partial(evaluate_search_results, llm=llm, system_prompt=system_prompt)
    assistant_node_node = partial(assistant_node, llm=llm, system_prompt=system_prompt)
    
    # 添加节点
    workflow.add_node('agent_router', agent_router_node)
    workflow.add_node('clarify_with_user', clarify_with_user_node)
    workflow.add_node("analyze_need_web_search", analyze_need_web_search_node)
    workflow.add_node("generate_search_query", generate_search_query_node)

    workflow.add_node("web_search", web_search_node)
    workflow.add_node("evaluate_search_results", evaluate_search_results_node)
    workflow.add_node("assistant", assistant_node_node)
    
    # 添加普通边
    workflow.add_edge(START, "agent_router")
    
    # 添加条件边
    workflow.add_conditional_edges(
        "analyze_need_web_search", 
        lambda state: state['isNeedWebSearch'], 
        {True: "generate_search_query", False: "assistant"}
    )
    workflow.add_conditional_edges("generate_search_query", need_web_search,"web_search")

    workflow.add_edge("web_search", "evaluate_search_results")
    workflow.add_conditional_edges(
        "evaluate_search_results", 
        need_web_search, 
        ["web_search","assistant"]
    )
    workflow.add_edge("assistant", END)
    
    # 编译图形
    app = workflow.compile()
    
    return app