import { supabase } from "@/lib/supabase";

export async function invokeEdgeFunction<TPayload extends Record<string, unknown>>(
  name: string,
  payload: TPayload,
): Promise<void> {
  const { error } = await supabase.functions.invoke(name, { body: payload });
  if (error) {
    throw new Error(error.message);
  }
}
