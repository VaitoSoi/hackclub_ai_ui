import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import api from "@/lib/api";
import { error, success } from "../hooks/toast";
import { AxiosError } from "axios";
import type { APIUser } from "@/lib/typing";
import { useNavigate } from "react-router";

export interface LoginResponse {
    access_token: string,
    token_type: "bearer",
    user: APIUser
}

export default function () {
    const navigator = useNavigate();

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const [notFillUsername, setNotFillUserName] = useState<boolean>(false);
    const [notFillPassword, setNotFillPassword] = useState<boolean>(false);
    const [userNotFound, setUserNotFound] = useState<boolean>(false);
    const [wrongPassword, setWrongPassword] = useState<boolean>(false);

    function handlerLogin() {
        if (!username || !password) {
            setNotFillUserName(!username);
            setNotFillPassword(!password);
        } else login();
    }
    async function login() {
        const loginForm = new FormData();
        loginForm.set("username", username);
        loginForm.set("password", password);
        try {
            const response = await api.post<LoginResponse>("/user/login", loginForm);
            localStorage.setItem("token", response.data.access_token);
            localStorage.setItem("username", response.data.user.username);
            success("Logined");
            navigator("/", { viewTransition: true });
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 404)
                    setUserNotFound(true);
                else if (err.status == 401)
                    setWrongPassword(true);
            }
            if (err instanceof Error)
                error(err.message);
            console.error(err);
        }
    }

    return <div className="w-screen h-screen flex bg-[#171717]">
        <div className="w-1/4 m-auto flex flex-col bg-[#404040] p-10 rounded-2xl gap-4">
            <p className="w-full text-center text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-b from-fuchsia-50 to-pink-600">Welcome back</p>
            <div>
                <p className="text-white">Username</p>
                <Input
                    className="rounded-4xl bg-white"
                    placeholder="vaitosoi"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        if (notFillUsername)
                            setNotFillUserName(false);
                        if (userNotFound)
                            setUserNotFound(false);
                    }}
                />
                {
                    notFillUsername
                    && <p className="text-red-500">* Please fill this field</p>
                }
                {
                    userNotFound
                    && <p className="text-red-500">* User not found D:</p>
                }
            </div>
            <div>
                <p className="text-white">Password</p>
                <Input
                    type="password"
                    className="h-10 rounded-4xl bg-white"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (notFillPassword)
                            setNotFillPassword(false);
                        if (wrongPassword)
                            setWrongPassword(false);
                    }}
                    onKeyDown={(event) => event.key.toLowerCase() == "enter" && handlerLogin()}
                />
                {
                    notFillPassword
                    && <p className="text-red-500">* Please fill this field</p>
                }
                {
                    wrongPassword
                    && <p className="text-red-500">* Wrong password D:</p>
                }
            </div>
            <div className="w-full">
                <Button
                    variant="ghost"
                    className="w-full bg-[#737373] rounded-4xl text-xl font-normal"
                    onClick={handlerLogin}
                >
                    Login
                </Button>
                <p className="w-full text-center text-white">Not have an account, <a href="/signup" className="hover:underline">sign up</a></p>
            </div>
        </div>
    </div>;
}