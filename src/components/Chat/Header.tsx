import api from "@/lib/api";
import { useEffect, useState } from "react";
import { error } from "../hooks/toast";

export default function () {
    const [modelName, setModelName] = useState<string>(null);

    useEffect(() => void getModelName(), []);
    async function getModelName() {
        try {
            const response = await api.get("/model");
            setModelName(response.data);
        } catch (err) {
            if (err instanceof Error)
                error(err.message);
            console.error(err);
        }
    }

    return <div className="h-1/12 w-full bg-[#FDF5AA] rounded-md p-5 flex flex-row items-center gap-2">
        <p className="font-semibold text-2xl">Hackclub AI</p>
        {modelName && <>
            <p className="text-xl font-semibold">|</p>
            <p className="text-xl">Using model <span className="font-mono">{modelName}</span></p>
        </>}
    </div>;
}