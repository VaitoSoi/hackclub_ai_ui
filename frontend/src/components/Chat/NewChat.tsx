import { useEffect, useState } from "react";
import { error } from "../hooks/toast";
import api from "@/lib/api";
import { SidebarTrigger } from "../ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Calculator, ChevronDown, CircleArrowUp, CodeXml, RefreshCw, Salad } from "lucide-react";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import type { CreateConversationResponse } from "@/lib/typing";
import { useNavigate } from "react-router";

const SamplePrompt: Record<"code" | "math" | "meal", string[]> = {
    code: [
        "Code a Python program that reads a CSV file of student names and scores, calculates each student’s average, and prints the top 3 students.",
        "Write a TypeScript function that takes an array of numbers and returns a new array with duplicates removed.",
        "Implement a Rust program that counts the frequency of each character in a string and prints the results in descending order.",
        "Create a C++ program that simulates a basic calculator supporting +, -, *, and / operations using functions.",
        "Write a Python program to fetch weather data from an API using requests, parse the JSON response, and display the temperature trend for the next 5 days.",
        "Implement a TypeScript class for a simple todo-list app that supports adding, removing, and listing tasks.",
        "Code a Rust program that generates the first 20 Fibonacci numbers using an iterator.",
        "Write a C++ program that reads a list of integers from a file, sorts them using merge sort, and writes the result back to another file.",
        "Create a Python program for a text-based Tic-Tac-Toe game where two players take turns, and the program checks for win/draw conditions.",
        "Implement a Rust program that simulates a bank account with deposit, withdraw, and balance-checking methods.",
        "Write a TypeScript function that takes two strings and checks if they are anagrams of each other.",
        "Code a C++ program to implement Dijkstra's shortest path algorithm and show the shortest route between two cities given a weighted graph.",
        "Create a Python program that downloads 5 different web pages asynchronously using asyncio and aiohttp, then prints the first 100 characters of each page.",
        "Implement a Rust program that validates a Sudoku solution from a 9x9 grid input.",
        "Write a TypeScript function that flattens a deeply nested array of numbers into a single array."
    ],
    math: [
        "Find the sum of the first 50 positive integers.",
        "Solve for x: 3x + 7 = 25.",
        "A rectangle has a length 5 cm longer than its width. If its area is 84 cm², find its dimensions.",
        "Simplify: (3x^2y^3)(2x^4y).",
        "Find the roots of the quadratic equation: x^2 - 5x + 6 = 0.",
        "Evaluate: 2^5 x 2^3 ÷ 2^4.",
        "If 5 pencils cost $3, how much do 12 pencils cost?",
        "A car travels 60 km in 1.5 hours. What is its average speed in km/h?",
        "Find the derivative of f(x) = 3x^3 - 5x^2 + 2x - 7.",
        "Compute the integral ∫ (2x + 1) dx."
    ],
    meal: [
        "Plan a 7-day meal schedule for a vegetarian who needs 2,000 calories per day.",
        "Create a 3-day meal plan for a college student on a budget of $10 per day.",
        "Design a weekly meal plan for a family of four, making sure no dinner is repeated.",
        "Generate a 5-day high-protein meal plan suitable for someone who goes to the gym daily.",
        "Plan a 1-week low-carb meal schedule with less than 50g of carbs per day.",
        "Create a balanced meal plan for a person with lactose intolerance.",
        "Make a 7-day meal planner that includes breakfast, lunch, and dinner with at least 2 fruits per day.",
        "Design a cultural meal plan where each day features food from a different country.",
        "Plan meals for 3 days using only ingredients that can be stored in the freezer.",
        "Create a meal schedule for a diabetic patient, limiting sugar and refined carbs."
    ],
};

export default function () {
    const navigator = useNavigate();
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const [selectedModel, setSeletedModel] = useState<string>("");
    const [models, setModels] = useState<string[]>([]);
    const [prompt, setPrompt] = useState<string>("");
    const [prompting, setPrompting] = useState<boolean>(false);
    const [bePatient, setBePatient] = useState<boolean>(false);

    useEffect(() => void getModels(), []);
    async function getModels() {
        try {
            const response = await api.get<string[]>("/ai/models");
            setModels(response.data);
            setSeletedModel(response.data[0]);
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    useEffect(() => {
        if (prompting)
            setTimeout(() => prompting && setBePatient(true), 5_000);
        else
            setBePatient(false);
    }, [prompting]);

    async function sendPrompt() {
        if (!selectedModel) return error("No model is selected >:(");
        try {
            setPrompting(true);
            const response = await api.post<CreateConversationResponse>("/ai/conversation",
                {
                    content: prompt,
                    model_id: selectedModel
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setPrompting(false);
            navigator(`/chat/${response.data.conversation.id}`);
        } catch (err) {
            setPrompting(false);
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <div className="h-full w-full flex flex-col bg-[#545454] rounded-md">
        <div className="flex flex-row items-center mt-4 ml-5 gap-2">
            <SidebarTrigger className="text-white bg-[#707070] p-6" />
            <div className="flex flex-row items-center text-white gap-2 bg-[#707070] p-2 rounded-md">
                <p className="text-xl">{selectedModel}</p>
                <Separator className="bg-white" orientation="vertical" />
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <ChevronDown className="hover:bg-[#545454] cursor-pointer rounded-md p-1 size-10" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="bg-[#707070] border-[#707070]"
                    >
                        {models.map(model =>
                            <DropdownMenuItem
                                className="text-white text-xl"
                                onClick={() => setSeletedModel(model)}
                            >
                                {model}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className="flex flex-col mt-[15%] ml-[20%] gap-5">
            <div className="flex flex-col text-white text-[45px] font-bold">
                <p><span className="bg-clip-text text-transparent bg-gradient-to-t from-fuchsia-50 to-pink-600">Hello, {username}</span> ✨</p>
                <p>How can I help you today?</p>
            </div>
            <div className="flex flex-row gap-5">
                <div
                    className="flex flex-col gap-2 h-40 w-50 rounded-2xl bg-gradient-to-tr from-pink-400 to-fuchsia-900 cursor-pointer"
                    onClick={() => setPrompt(SamplePrompt.code[Math.round(Math.random() * SamplePrompt.code.length)])}
                >
                    <div className="p-2 mt-5 ml-4 w-fit h-fit rounded-full bg-gray-400/50">
                        <CodeXml className="size-8" />
                    </div>
                    <div className="h-full w-full px-5 text-wrap">
                        <p className="font-semibold text-xl">
                            Write code
                        </p>
                    </div>
                </div>
                <div
                    className="flex flex-col gap-2 h-40 w-50 rounded-2xl bg-gradient-to-tr from-pink-400 to-fuchsia-900 cursor-pointer"
                    onClick={() => setPrompt(SamplePrompt.math[Math.round(Math.random() * SamplePrompt.math.length)])}
                >
                    <div className="p-2 mt-5 ml-4 w-fit h-fit rounded-full bg-gray-400/50">
                        <Calculator className="size-8" />
                    </div>
                    <div className="h-full w-full px-5 text-wrap">
                        <p className="font-semibold text-xl">
                            Do math
                        </p>
                    </div>
                </div>
                <div
                    className="flex flex-col gap-2 h-40 w-50 rounded-2xl bg-gradient-to-tr from-pink-400 to-fuchsia-900 cursor-pointer"
                    onClick={() => setPrompt(SamplePrompt.meal[Math.round(Math.random() * SamplePrompt.meal.length)])}
                >
                    <div className="p-2 mt-5 ml-4 w-fit h-fit rounded-full bg-gray-400/50">
                        <Salad className="size-8" />
                    </div>
                    <div className="h-full w-full px-5 text-wrap">
                        <p className="font-semibold text-xl">
                            Daily meal planner
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <div className="mt-auto flex flex-col p-5">
            {bePatient && <p className="py-2 pl-3 text-xl text-white">🍲 Cooking, please be patient 🥺</p>}
            <div className="h-fit w-full flex flex-row gap-2 items-center">
                <Input
                    className="h-10 w-full mt-auto border-[#707070] text-white"
                    value={prompt}
                    onChange={(event) => !prompting && setPrompt(event.target.value)}
                    placeholder="Say something, please ;-;"
                    onKeyDown={(event) => {
                        if (event.key.toLowerCase() != "enter") return;
                        sendPrompt();
                    }}
                />
                {prompting
                    ? <RefreshCw className="text-white size-7 animate-spin cursor-not-allowed" />
                    : <CircleArrowUp className="text-white size-7 cursor-pointer" onClick={() => sendPrompt()} />}
            </div>
        </div>
    </div>;
}