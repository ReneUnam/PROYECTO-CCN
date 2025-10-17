import { useEffect, useState } from "react";
import { supabase } from "@/core/api/supabaseClient";

export const LoginPage = () => {
    const [data, setData] = useState<string>("Conectando...");

    useEffect(() => {
        const test = async () => {
            const { data, error } = await supabase.from("test").select("*").limit(1);
            if (error) setData("Error al conectar 😢");
            else setData("Conexión exitosa ✅");
        };
        test();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <h1>Prueba Supabase</h1>
            <p>{data}</p>
        </div>
    );
};
