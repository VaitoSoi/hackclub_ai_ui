import { SidebarTrigger } from "@/components/ui/sidebar";
import Huh from "@/assets/Huh.svg";

export default function () {
    return <div className="h-full w-full flex flex-col bg-[#545454] rounded-md">
        <div className="flex flex-row items-center mt-4 ml-5 gap-2">
            <SidebarTrigger className="text-white bg-[#707070] p-6" />
        </div>
        <div className="flex gap-2 flex-col items-center m-auto text-white text-[50px]">
            <img src={Huh} className="size-75 ml-10"/>
            <p className="font-bold">Page not found</p>
            <p>Where are you going ?</p>
            <div className="mb-20" />
        </div>
    </div>;
}