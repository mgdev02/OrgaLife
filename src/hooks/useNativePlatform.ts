import { useEffect, useState } from "react";
import {
  getNativePlatform,
  subscribeNativePlatform,
  type NativePlatform,
} from "../lib/nativeAPI";

export function useNativePlatform(): NativePlatform {
  const [platform, setPlatform] = useState<NativePlatform>("web");

  useEffect(() => subscribeNativePlatform(setPlatform), []);

  useEffect(() => {
    void getNativePlatform().then(setPlatform);
  }, []);

  return platform;
}
