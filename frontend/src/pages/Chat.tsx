import Chat from "@/components/Chat/Chat";
import { error } from "@/components/hooks/toast";
import api from "@/lib/api";
import type { GetConversationsResponse } from "@/lib/typing";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import NotFound from "./NotFound";

export default function () {
    const navigator = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");

    const { id: conversationId } = useParams();
    const [notFound, setNotFound] = useState<boolean>(true);

    useEffect(() => void init(), [location.key]);
    async function init() {
        if (!token) return navigator("/login");

        try {
            const response = await api.get<GetConversationsResponse[]>(`/ai/conversations`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const conversationIds = response.data.map(con => con.id);
            if (!conversationIds.includes(conversationId))
                setNotFound(true);
            else
                setNotFound(false);
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

    return <>{notFound ? <NotFound /> : <Chat id={conversationId} />}</>;
}