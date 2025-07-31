import { useState } from "react";
import { error } from "../hooks/toast";
import api from "@/lib/api";
import { ScrollArea } from "../ui/scroll-area";
import hackclub from "@/assets/hackclub.svg";
import user from "@/assets/user.svg";
import { LoaderCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Markdown from "react-markdown";

type History = {
    role: "user",
    content: string,
} | {
    role: "assistant",
    error?: string,
    content?: string,
    think?: string
};

interface Response {
    "choices": ResponseChoices[],
    "created": number,
    "id": string,
    "model": string,
    "object": string,
    "service_tier": string,
    "system_fingerprint": string,
    "usage_breakdown": any,
    "x_groq": object
}

interface ResponseChoices {
    finish_reason: string,
    index: number,
    logprobs: any,
    message: {
        content: string,
        role: "assistant"
    }
}

const ThinkRegex = /^<think>([\s\S]+)<\/think>([\s\S]+)$/;

function stripNewlinesEdges(str: string) {
    return str.replace(/^[\n\r]+|[\n\r]+$/g, '');
}


export default function () {
    const [history, setHistory] = useState<History[]>([]);
    const [prompting, setPrompting] = useState<boolean>(false);
    const [promt, setPrompt] = useState<string>("");

    async function sendPrompt() {
        try {
            setPrompting(true);
            const response = await api.post<Response>("/chat/completions", { messages: history });
            const rawResponse = response.data.choices.pop()?.message.content;
            const [, think, botResponse] = ThinkRegex.exec(rawResponse) || [null, undefined, rawResponse];
            history.push({ role: "assistant", content: stripNewlinesEdges(botResponse), think: stripNewlinesEdges(think) });
            setPrompting(false);
            console.log(history);
        } catch (err) {
            if (err instanceof Error) {
                error(err.message);
                setHistory((history) => [...history, { role: "assistant", error: err.message }]);
            } else
                setHistory((history) => [...history, { role: "assistant", error: "Error" }]);
            console.error(err);
            setPrompting(false);
        }
    }

    return <div className="h-full w-full flex flex-col gap-5 overflow-hidden">
        <ScrollArea className="h-18/21 w-full py-5 px-15 bg-[#FDF5AA] rounded-md">
            {history.map((history) =>
                history.role == "assistant"
                    ? <div className="w-10/12 flex flex-row mr-auto gap-2">
                        <img src={hackclub} className="rounded-full size-10 mt-2" />
                        <div className="text-xl">
                            {history.think && <Accordion type="single" collapsible>
                                <AccordionItem value="think">
                                    <AccordionTrigger className="text-xl">
                                        Thinking
                                    </AccordionTrigger>
                                    <AccordionContent className="text-xl">{history.think}</AccordionContent>
                                </AccordionItem>
                            </Accordion>}
                            <p><Markdown>{history.content || history.error}</Markdown></p>
                        </div>
                    </div>
                    : <div className="w-10/12 flex flex-row ml-auto gap-2 justify-end">
                        <p className="text-xl mt-2">{history.content}</p>
                        <img src={user} className="rounded-full bg-white size-10" />
                    </div>
            )}
            {prompting && <div className="flex flex-row items-center gap-2 mr-auto">
                <img src={hackclub} className="rounded-full size-10" />
                <LoaderCircle className="animate-spin size-10" />
            </div>}
        </ScrollArea>
        <input
            className="bg-[#FDF5AA] py-2 px-4 rounded-md h-2/21 text-2xl"
            type="text"
            placeholder={!prompting ? "Type something" : "Waiting for response..."}
            value={promt}
            onChange={(event) => !prompting && setPrompt(event.target.value)}
            onKeyDown={(event) => {
                if (event.key.toLowerCase() != "enter") return;
                history.push({ role: "user", content: promt });
                setHistory(history);
                setPrompt("");
                sendPrompt();
            }}
        />
    </div>;
}