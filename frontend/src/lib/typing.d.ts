export interface APIUser {
    id: string,
    username: string,
}

export interface GetUserReponse {
    id: string,
    username: string,
    model_personality: string
}

export interface GetConversationsResponse {
    id: string,
    model_id: string,
    title: string,
    user_id: string,
    created_at: string
}


export interface History extends ConversationMessage {
    error?: string,
}

export interface BranchInfo {
    total: number,
    current: number
}

export interface ConversationMessage {
    role: "user" | "assistant" | "system",
    id: string,
    content: string,
    reasoning: string,
    branch?: BranchInfo
}

export interface BaseConservation {
    model_id: string,
    title: string,
    id: string
}

export interface GetConservationResponse extends BaseConservation {
    messages: ConversationMessage[]
}

export interface SendPromptResponse {
    user: APIMessageResponse,
    model: APIMessageResponse
}

export interface CreateConversationResponse extends SendPromptResponse {
    conversation: BaseConservation
}

export interface APIMessageResponse {
    content: string,
    role: "user" | "assistant" | "system",
    reasoning: string | null,
    id: string
}