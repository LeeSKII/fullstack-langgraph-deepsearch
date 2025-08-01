"""
搜索智能体的数据模型定义
包含所有用于状态管理、输入输出和结构化数据的 Pydantic 模型
"""

from typing import NotRequired
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from enum import Enum
from operator import add
from typing import List
from typing_extensions import Annotated


class SearchDepthEnum(str, Enum):
    """搜索深度枚举"""
    BASIC = "basic"
    ADVANCED = "advanced"


class WebSearchJudgement(BaseModel):
    """判断是否需要网页搜索的模型"""
    reason: str = Field(description="选择执行该动作的原因")
    confidence: float = Field(description="置信度，评估是否需要网页搜索的可靠性")
    isNeedWebSearch: bool = Field(description="是否需要通过网页搜索获取足够的信息进行回复")

# class WebSearchQuery(BaseModel):
#     """网页搜索查询模型"""
#     query: str = Field(description="预备进行网络搜索查询的问题")
#     search_depth: SearchDepthEnum = Field(description="搜索的深度，枚举值：BASIC、ADVANCED")
#     reason: str = Field(description="生成该搜索问题的原因")
#     confidence: float = Field(description="关联度，评估生成的搜索问题和用户提问的关联度")

class EvaluateWebSearchResult(BaseModel):
    """评估搜索结果的模型"""
    knowledge_gap: str = Field(default="", description="Describe what information is missing or needs clarification")
    is_sufficient: bool = Field(description="Whether the provided summaries are sufficient to answer the user's question.")
    follow_up_queries: List[str] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )

class ClarifyUser(BaseModel):
    """澄清用户需求模型"""
    question: str = Field(
        description="A question to ask the user to clarify the report scope",
    )
    verification: str = Field(
        description="Verify message that we will start research after the user has provided the necessary information.",
    )
    need_clarification: bool = Field(
        description="Whether the user needs to be asked a clarifying question.",
    )

class AnalyzeRouter(BaseModel):
    reason: str = Field(
        description="The reason why the question needs to perform a deep research.",
    )
    confidence: float = Field(
        description="The confidence of the assistant's decision to perform a deep research. From 0 to 1.",
    )
    need_deep_research: bool = Field(
        description="Whether the assistant needs to perform a deep research.",
    )

class SearchQueryList(BaseModel):
    rationale: str = Field(
        description="A brief explanation of why these queries are relevant to the research topic."
    )
    query: List[str] = Field(
        description="A list of search queries to be used for web research."
    )
    

class WebSearchState(TypedDict):
    search_query: str
    id: str

class WebSearchDoc(BaseModel):
    """网页搜索结果模型"""
    title: str = Field(description="网页标题")
    url: str = Field(description="网页链接")
    content: str = Field(description="网页内容")

# 定义状态类
class OverallState(TypedDict):
    """工作流状态类，用于在各个节点之间传递状态"""
    query: str  # 用户查询
    messages: list[dict]  # 消息历史
    web_search_query_wait_list: list[str]  # 待网络搜索查询列表
    web_search_depth: str  # 搜索深度
    web_search_results_list: Annotated[list, add]  # 搜索结果列表
    web_search_queries_list: Annotated[list, add]  # 搜索查询历史列表
    max_search_loop: int  # 最大搜索循环次数
    search_loop: int  # 当前搜索循环次数
    response: str  # 响应内容
    isNeedWebSearch: bool  # 是否需要网络搜索
    reason: str  # 判断原因
    confidence: float  # 置信度
    is_sufficient: bool  # 搜索结果是否足够
    followup_search_query: list[str]  # 后续搜索查询
    knowledge_gap: str  # 知识缺口


class InputData(TypedDict):
    """API输入数据模型"""
    query: str  # 必填字段
    messages: NotRequired[list[dict]]  # 可选字段