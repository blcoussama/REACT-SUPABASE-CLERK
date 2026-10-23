import { useState } from "react";
import supabase from "@/utils/supabase";

/**
 * Calls an API function `cb(supabase, options, ...args)` and tracks its state.
 * `fn` resolves with the result (or `undefined` when the call failed: see `error`).
 */
const useFetch = (cb, options = {}) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const fn = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await cb(supabase, options, ...args);
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { fn, data, loading, error };
};

export default useFetch;
