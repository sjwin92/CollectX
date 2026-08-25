import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// supabase-js caches realtime channels by name in the client's registry.
// Components that mount/unmount frequently (e.g. anything rendered inside a
// per-page Navbar, which remounts on every client-side navigation) can call
// `.channel(name)` again before the previous mount's async unsubscribe has
// finished, reusing an already-subscribed channel and throwing when `.on()`
// is called on it. Appending a random per-mount suffix guarantees no
// collision regardless of teardown timing — call once per subscribe (not per
// render) and interpolate into the channel name.
export function uniqueChannelSuffix(): string {
  return Math.random().toString(36).slice(2);
}
