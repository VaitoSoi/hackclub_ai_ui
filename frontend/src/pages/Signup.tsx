import { error, warning } from "@/components/hooks/toast";
import Signup from "@/components/Login/Signup";
import api from "@/lib/api";
import type { GetUserReponse } from "@/lib/typing";
import { AxiosError } from "axios";
import { useEffect } from "react";

export default function() {
    const token = localStorage.getItem("token");

    useEffect(() => void init(), []);
    async function init() {
        if (!token) return;

        try {
            await api.get<GetUserReponse>(`/user/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            warning("You're logged in");
        } catch (err) {
            if (err instanceof AxiosError) {
                if (
                    err.status == 401 ||
                    err.status == 404
                )
                    return;
            }

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <Signup />;
}