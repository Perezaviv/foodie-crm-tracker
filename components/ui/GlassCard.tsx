import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "default" | "interactive";
    gradientBorder?: boolean;
}

export const GlassCard = ({
    children,
    className,
    variant = "default",
    gradientBorder = false,
    ...props
}: GlassCardProps) => {
    const baseClass =
        variant === "interactive" ? "glass-panel-interactive" : "glass-panel";

    if (gradientBorder) {
        return (
            <div className={cn("relative p-[1px] rounded-2xl bg-gradient-to-br from-white/20 via-white/5 to-transparent", className)}>
                <div
                    className={cn(
                        "bg-zinc-950/80 backdrop-blur-xl rounded-2xl h-full w-full overflow-hidden",
                        variant === "interactive" && "hover:bg-zinc-900/60 transition-colors duration-300"
                    )}
                    {...props}
                >
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(baseClass, "rounded-2xl overflow-hidden", className)} {...props}>
            {children}
        </div>
    );
};
