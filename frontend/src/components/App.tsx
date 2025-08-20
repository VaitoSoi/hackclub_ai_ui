import { useState, type ComponentProps } from "react";
import "../index.css";
import { Toaster } from "./ui/sonner";
import Sidebar from "./Sidebar/Sidebar";
import { SidebarProvider } from "./ui/sidebar";

export default function ({ children }: ComponentProps<"div">) {
    const [open, setOpen] = useState<boolean>(true);

    return <>
        <SidebarProvider
            style={{
                "--sidebar-width": "20rem"
            } as React.CSSProperties}
            open={open}
            onOpenChange={setOpen}
        >
            <Toaster />
            <Sidebar />
            <div className="w-screen h-screen flex bg-[#171717]">
                <div className={"m-5 w-full flex flex-col " + (open && "ml-0")}>
                    {children}
                </div>
            </div>
        </SidebarProvider>
    </>;
}