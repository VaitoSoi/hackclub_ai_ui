import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AxiosError } from "axios";
import { error, success } from "../hooks/toast";
import api from "@/lib/api";
import { useNavigate } from "react-router";

const UsernameRegex = /^[0-9a-z_]+$/;

export default function () {
    const navigator = useNavigate();

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
    const [invalidPassword, setInvalidPassword] = useState<boolean>(false);
    const [notFillUsername, setNotFillUserName] = useState<boolean>(false);
    const [notFillPassword, setNotFillPassword] = useState<boolean>(false);
    const [notFillConfirmPassword, setNotFillConfirmPassword] = useState<boolean>(false);
    const [notMatchPassword, setNotMatchPassword] = useState<boolean>(false);


    async function signup() {
        try {
            await api.post('/user/', {
                username,
                password
            });
            success("Sign up successfully");
            navigator("/login");
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

    function handlerSignup() {
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
        else signup();
    }

    return <div className="w-screen h-screen flex bg-[#171717]">
        <div className="w-1/4 m-auto flex flex-col bg-[#404040] p-10 rounded-2xl gap-4">
            <p className="w-full text-center text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-b from-fuchsia-50 to-pink-600">Hi new friend</p>
            <div>
                <p className="text-white">Username</p>
                <Input
                    className="rounded-4xl bg-white"
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
                    className="h-10 rounded-4xl bg-white"
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
                    className="h-10 rounded-4xl bg-white"
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
            <div className="w-full">
                <Button
                    variant="ghost"
                    className="w-full bg-[#737373] rounded-4xl text-xl font-normal cursor-pointer"
                    onClick={handlerSignup}
                >
                    Sign up
                </Button>
                <p className="w-full text-center text-white">Already have an account, <a href="/login" className="hover:underline">login in</a></p>
            </div>
        </div>
    </div>;
}