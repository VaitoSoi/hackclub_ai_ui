import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { error } from "../hooks/toast";
import api from "@/lib/api";
import { ScrollArea } from "../ui/scroll-area";
import hackclub from "@/assets/hackclub.svg";
import user from "@/assets/user.svg";
import { ChevronLeft, ChevronRight, CircleArrowUp, LoaderCircle, Pencil, PencilOff, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Markdown from "react-markdown";
import { Input } from "../ui/input";
import { SidebarTrigger } from "../ui/sidebar";
import remarkGfm from "remark-gfm";
import type { ConversationMessage, GetConservationResponse, History, SendPromptResponse } from "@/lib/typing";


export default function ({ id: conversationId }: { id: string }) {
    const token = localStorage.getItem("token");
    const location = useLocation();

    const [title, setTitle] = useState<string>("");
    const [selectedModel, setSeletedModel] = useState<string>("");

    const [history, setHistory] = useState<History[]>([]);
    const [prompting, setPrompting] = useState<boolean>(false);

    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [promt, setPrompt] = useState<string>("");

    useEffect(() => void getConservation(), [location.key]);
    async function getConservation(hasMessage?: string) {
        try {
            const response = await api.get<GetConservationResponse>(
                `/ai/conversation?id=${conversationId}` +
                (hasMessage ? `&message=${hasMessage}` : ""),
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setHistory(response.data.messages);
            setSeletedModel(response.data.model_id);
            setTitle(response.data.title);
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    async function sendPrompt(
        content: string,
        previousId: string = history[editingIndex > 0 ? editingIndex - 1 : history.length - 1].id
    ) {
        try {
            setPrompting(true);
            if (editingIndex)
                setHistory((oldHistory) => [
                    ...oldHistory.slice(0, editingIndex),
                    {
                        content, id: "", role: "user", reasoning: null,
                        branch: {
                            current: (history[editingIndex].branch?.current || 1) + 1,
                            total: (history[editingIndex].branch?.total || 1) + 1
                        }
                    }
                ]);
            else
                setHistory((history) => [...history, { content, id: "", role: "user", reasoning: null }]);
            const response = await api.post<SendPromptResponse>("/ai/prompt",
                {
                    message_id: previousId,
                    content
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setPrompting(false);
            if (editingIndex > 0) {
                setEditingIndex(0);
                getConservation();
            } else
                setHistory((history) => {
                    const newHistory = [...history];
                    newHistory.pop();
                    newHistory.push(response.data.user, response.data.model);
                    return newHistory;
                });
        } catch (err) {
            setPrompting(false);
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    async function shift(parentIndex: number, direction: 1 | -1) {
        try {
            const parent = history[parentIndex];
            if (!parent.branch) return;

            const children = await api.get<ConversationMessage[]>(`/ai/children?id=${parent.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const targetIndex = parent.branch.current - 1 + direction;
            if (targetIndex < 0 || targetIndex > parent.branch.total)
                return;

            const targetMessage = children.data[targetIndex];
            return await getConservation(targetMessage.id);
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <div className="h-full w-full flex flex-col bg-[#545454] rounded-md">
        <div className="flex flex-row items-center mt-4 ml-5 gap-2">
            <SidebarTrigger className="text-white bg-[#707070] p-6" />
            <div className="text-white bg-[#707070] p-2 rounded-md">
                <p className="text-xl">{selectedModel}</p>
            </div>
            <div className="text-white bg-[#707070] p-2 rounded-md">
                <p className="text-xl">{title}</p>
            </div>
        </div>
        <ScrollArea className="w-full py-2 px-15 h-33/40">
            {history.map((currentMessage, index) =>
                currentMessage.role != "assistant" && currentMessage.role != "user"
                    ? ""
                    : currentMessage.role == "assistant"
                        ? <div className="w-10/12 flex flex-row mr-auto gap-2">
                            <img src={hackclub} className="rounded-full size-10 mt-3" />
                            <div className={"text-xl bg-[#707070] rounded-2xl px-5 pb-3 m-2 " + (
                                !currentMessage.reasoning && "py-3"
                            )}>
                                {currentMessage.reasoning && <Accordion type="single" collapsible>
                                    <AccordionItem value="think">
                                        <AccordionTrigger className="text-xl">
                                            Thinking
                                        </AccordionTrigger>
                                        <AccordionContent className="text-lg ml-5">{currentMessage.reasoning}</AccordionContent>
                                    </AccordionItem>
                                </Accordion>}
                                <Markdown 
                                    remarkPlugins={[remarkGfm]}
                                >{currentMessage.content || currentMessage.error}</Markdown>
                            </div>
                        </div>
                        : <div className="w-10/12 flex flex-row ml-auto gap-2 justify-end">
                            <div className="flex flex-col h-fit w-fit ml-auto">
                                <p className="text-lg bg-[#707070] rounded-2xl px-5 py-3 my-1">{currentMessage.content}</p>
                                <div className="ml-auto mr-2 flex flex-row items-center">
                                    {history[index - 1].branch && <div className="flex flex-row items-center gap-1">
                                        <ChevronLeft
                                            className={"rounded-full size-8 p-1 " + (history[index - 1].branch.current > 1 && "hover:bg-[#707070]")}
                                            onClick={() => !prompting && shift(index - 1, -1)}
                                        />
                                        <span>{history[index - 1].branch.current}/{history[index - 1].branch.total}</span>
                                        <ChevronRight
                                            className={"rounded-full size-8 p-1 " + (history[index - 1].branch.current < history[index - 1].branch.total && "hover:bg-[#707070]")}
                                            onClick={() => !prompting && shift(index - 1, 1)}
                                        />
                                    </div>}
                                    {editingIndex == index
                                        ? <PencilOff
                                            className="hover:bg-[#707070] p-2 rounded-2xl size-10"
                                            onClick={() => { setEditingIndex(0); setPrompt(currentMessage.content); }}
                                        />
                                        : <Pencil
                                            className="hover:bg-[#707070] p-2 rounded-2xl size-10"
                                            onClick={() => { setEditingIndex(index); setPrompt(currentMessage.content); }}
                                        />
                                    }
                                </div>
                            </div>
                            <img src={user} className="rounded-full mt-3 bg-white size-10" />
                        </div>
            )}
            {prompting && <div className="flex flex-row items-center gap-2 mr-auto">
                <img src={hackclub} className="rounded-full size-10" />
                <LoaderCircle className="animate-spin size-10" />
            </div>}
        </ScrollArea>
        <div className="mt-auto w-full px-5 py-2 flex flex-col gap-2">
            {editingIndex > 0 && <div className="flex flex-row items-center gap-1 bg-[#707070] rounded-2xl p-2">
                <X className="rounded-full hover:bg-white" onClick={() => setEditingIndex(0)} />
                <p><span className="font-semibold">Editing</span> {history[editingIndex].content.slice(0, 100)} {history[editingIndex].content.length > 100 && "..."}</p>
            </div>}
            <div className="flex flex-row gap-2 items-center">
                <Input
                    className="h-10 w-full mt-auto border-[#707070] text-white"
                    type="text"
                    placeholder={!prompting ? "Say somthing, please ;-;" : "Waiting for response..."}
                    disabled={prompting}
                    value={promt}
                    onChange={(event) => !prompting && setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key.toLowerCase() != "enter") return;
                        if (prompting || !promt) return;
                        sendPrompt(promt);
                        setPrompt("");
                    }}
                />
                <CircleArrowUp
                    className={"text-white size-7 " + (prompting ? "cursor-not-allowed" : "cursor-pointer")}
                    onClick={() => {
                        if (prompting || !promt) return;
                        sendPrompt(promt);
                        setPrompt("");
                    }}
                />
            </div>
        </div>
    </div>;
}