import { FC, useState } from "react";
import Select, { SelectProps } from "../Select";

const Example: FC<Omit<SelectProps, 'value' | 'onChange'>> = ({
    disabled = false,
    size = "medium",
    options,
    placeholder = "Select an option",
    enableClickAnimation = true,
}) => {
    const [value, setValue] = useState("");

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                width: "100%",
                flexDirection: "column",
                gap: "20px",
                padding: "20px",
            }}
        >
            <div style={{ width: "min(400px, 100%)" }}>

            <Select
                size={size}
                disabled={disabled}
                options={options}
                value={value}
                onChange={setValue}
                placeholder={placeholder}
                enableClickAnimation={enableClickAnimation}
            />
            </div>
            {value && (
                <div style={{ color: "white", fontSize: "14px" }}>
                    Selected value: {value}
                </div>
            )}
        </div>
    );
};

export default Example;
