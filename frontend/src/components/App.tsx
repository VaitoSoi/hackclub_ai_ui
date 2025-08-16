import "../index.css";
import Chat from "./Chat/Chat";
import Header from "./Chat/Header";

export default function () {
    return <div className="w-screen h-screen flex bg-[#0c263d]">
        <div className="m-10 w-full flex flex-col gap-4">
            <Header />
            <Chat />
        </div>
    </div>;
}