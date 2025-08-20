import { MessageSquarePlus, Search } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter
} from "../ui/sidebar";
import HackclubLogo from "@/assets/hackclub.svg";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { error, success } from "../hooks/toast";
import api from "@/lib/api";
import { ScrollArea } from "../ui/scroll-area";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import type { GetConversationsResponse } from "@/lib/typing";
import User from "@/assets/user.svg";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import { AxiosError } from "axios";
import { Textarea } from "../ui/textarea";

interface GetMe {
    id: string,
    username: string,
    model_personality: string
}

export default function () {
    const navigator = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const [conversations, setConversations] = useState<GetConversationsResponse[]>([]);

    useEffect(() => void getConversations(), [location.key]);
    async function getConversations() {
        try {
            const response = await api.get<GetConversationsResponse[]>(`/ai/conversations`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setConversations(response.data);
            // setConversations(
            //     [
            //         ...response.data,
            //         ...Array.from({ length: 50 })
            //             .map(() => ({
            //                 user_id: v4(),
            //                 created_at: "",
            //                 id: v4(),
            //                 model_id: "",
            //                 title: v4(),
            //             }))
            //     ]
            // );
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <Sidebar
        variant="sidebar"
        className="bg-[#171717] border-[#171717] py-5 pl-2 pr-0"
    >
        <ScrollArea className="h-[93%] w-[19rem] pr-5">
            <SidebarHeader className="flex flex-row items-center gap-2">
                <img src={HackclubLogo} className="rounded-full size-10" />
                <p className="text-2xl text-white">Hackclub AI</p>
            </SidebarHeader>
            <SidebarContent className="mt-2 overflow-x-hidden">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Button
                                    className="text-white w-full h-fit p-2 bg-[#171717] justify-start"
                                    variant="ghost"
                                    onClick={() => navigator("/", { viewTransition: true })}
                                >
                                    <MessageSquarePlus className="size-7" />
                                    <p className="text-lg">New chat</p>
                                </Button>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Button
                                    className="text-white w-full h-fit p-2 bg-[#171717] justify-start"
                                    variant="ghost"
                                >
                                    <Search className="size-7" />
                                    <p className="text-lg">Search</p>
                                </Button>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-white text-2xl">Conversations</SidebarGroupLabel>
                    <SidebarGroupContent className="w-[17rem]">{
                        conversations.map(conversation =>
                            <Button
                                className="text-white w-full h-fit px-3 bg-[#171717] justify-start"
                                variant="ghost"
                                onClick={() => navigator(`/chat/${conversation.id}#`)}
                            >
                                {conversation.title.length > 25
                                    ? <Tooltip>
                                        <TooltipTrigger><p className="text-lg">{conversation.title}</p></TooltipTrigger>
                                        <TooltipContent align="start"><p className="text-lg">{conversation.title}</p></TooltipContent>
                                    </Tooltip>
                                    : <p className="text-lg">{conversation.title}</p>}
                            </Button>)
                    }</SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </ScrollArea>
        <SidebarFooter>
            <Sheet>
                <SheetTrigger>
                    <div className="flex flex-row items-center px-4 py-2 mr-2 rounded-2xl gap-2 hover:bg-[#505050] cursor-pointer">
                        <img src={User} className="rounded-full size-10" />
                        <p className="text-white text-xl">{username}</p>
                    </div>
                </SheetTrigger>
                <SheetContent side="left" className="bg-[#505050] border-[#505050] text-xl text-white">
                    <Tabs defaultValue="account" className="w-full">
                        <SheetHeader>
                            <TabsList>
                                <TabsTrigger value="account">Account</TabsTrigger>
                                <TabsTrigger value="model">Model personality</TabsTrigger>
                            </TabsList>
                        </SheetHeader>
                        <TabsContent value="account"><Account /></TabsContent>
                        <TabsContent value="model"><ModelPersonality /></TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>
        </SidebarFooter>
    </Sidebar>;
}

const UsernameRegex = /^[0-9a-z_]+$/;

function Account() {
    const navigator = useNavigate();

    const token = localStorage.getItem("token");
    const oldUsername = localStorage.getItem("username");

    const [username, setUsername] = useState<string>(oldUsername);
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
    const [invalidPassword, setInvalidPassword] = useState<boolean>(false);
    const [notFillUsername, setNotFillUserName] = useState<boolean>(false);
    const [notFillPassword, setNotFillPassword] = useState<boolean>(false);
    const [notFillConfirmPassword, setNotFillConfirmPassword] = useState<boolean>(false);
    const [notMatchPassword, setNotMatchPassword] = useState<boolean>(false);


    async function update() {
        try {
            await api.put('/user/',
                {
                    username,
                    password
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            success("Update successfully");
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const data = err.response.data;
                    const message: string = data.detail.message;
                    if (message == "username already existed")
                        error("Username already existed");
                    else if (message == "invalid username")
                        error("Invalid username");
                    else if (message == "invalid password")
                        error("Invalid password");
                }
            } else {
                console.error(err);
                if (err instanceof Error)
                    error(err.message);
            }
        }
    }

    function handlerUpdate() {
        if (!username || !password || !confirmPassword) {
            setNotFillUserName(!username);
            setNotFillPassword(!password);
            setNotFillConfirmPassword(!confirmPassword);
        }
        else if (password != confirmPassword) {
            setNotMatchPassword(true);
        }
        else if (!UsernameRegex.test(username))
            setInvalidUsername(true);
        else if (password.length < 8)
            setInvalidPassword(true);
        else update();
    }

    return <div className="w-full flex flex-col px-5 py-2 rounded-2xl gap-4">
        <div>
            <p className="text-white">Username</p>
            <Input
                className="rounded-2xl bg-white text-black"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
            />
            {
                notFillUsername
                && <p className="text-red-500">* Please fill this field</p>
            }
            {
                invalidUsername
                && <p className="text-red-500">* Your username is invalid (allow 0-9, a-z, and underscore)</p>
            }
        </div>
        <div>
            <p className="text-white">Password</p>
            <Input
                type="password"
                className="h-10 rounded-2xl bg-white text-black"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />
            {
                notFillPassword
                && <p className="text-red-500">* Please fill this field</p>
            }
            {
                invalidPassword
                && <p className="text-red-500">* Your password is too short (at least 8 characters)</p>
            }
        </div>
        <div>
            <p className="text-white">Confirm password</p>
            <Input
                type="password"
                className="h-10 rounded-2xl bg-white text-black"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {
                notFillConfirmPassword
                && <p className="text-red-500">* Please fill this field</p>
            }
            {
                notMatchPassword
                && <p className="text-red-500">* Your password is not match</p>
            }
        </div>
        <div className="flex flex-row items-center gap-2 ml-auto">
            <Button
                variant="destructive"
                className="rounded-4xl text-xl font-normal cursor-pointer"
                onClick={() => {
                    localStorage.setItem("token", "");
                    navigator("/login");
                    success("Logged out");
                }}
            >
                Logout
            </Button>
            <Button
                variant="ghost"
                className="bg-[#737373] rounded-4xl text-xl font-normal cursor-pointer"
                onClick={handlerUpdate}
            >
                Update
            </Button>
        </div>
    </div>;
}

function ModelPersonality() {
    const token = localStorage.getItem("token");
    const [personality, setPersonality] = useState<string>("");
    const [noPersonality, setNoPersonality] = useState<boolean>(false);

    useEffect(() => void getPersonality(), []);
    async function getPersonality() {
        try {
            const response = await api.get<GetMe>(`/user/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setPersonality(response.data.model_personality);
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    async function submit() {
        try {
            const response = await api.put<GetMe>(`/user`, {
                model_personality: personality
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Changed :D");
        } catch (err) {
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <div className="flex flex-col py-2 px-4 gap-2">
        <p className="text-xl font-bold">Change how model responses</p>
        <div>
            <Textarea
                className="resize-none text-white"
                value={personality}
                onChange={(event) => {
                    setPersonality(event.target.value);
                    if (noPersonality)
                        setNoPersonality(false);
                }}
            />
            {noPersonality && <p className="text-red-500 text-lg">* No personality is entered<br />You don't want your model have a heart &gt;:(</p>}
        </div>
        <Button
            variant="ghost"
            className="ml-auto bg-[#737373] rounded-4xl text-xl font-normal cursor-pointer"
            onClick={() => {
                if (!personality)
                    return setNoPersonality(true);
                submit();
            }}
        >Submit</Button>
    </div>;
}