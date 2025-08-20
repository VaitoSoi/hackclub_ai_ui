import NewChat from "@/components/Chat/NewChat";
import { error } from "@/components/hooks/toast";
import api from "@/lib/api";
import type { GetUserReponse } from "@/lib/typing";
import { AxiosError } from "axios";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function() {
    const navigator = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => void init(), []);
    async function init() {
        if (!token) return navigator("/login");

        try {
            await api.get<GetUserReponse>(`/user/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (err) {
            if (err instanceof AxiosError) {
                if (
                    err.status == 401 ||
                    err.status == 404
                )
                    return navigator("/login");
            }

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <NewChat />;
}