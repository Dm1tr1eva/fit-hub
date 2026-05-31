import { createClient } from "@supabase/supabase-js"
import { createServerClient, parseCookieHeader } from "@supabase/ssr"
import { getHeader, setHeader } from "h3"
import { serialize } from "cookie"

export async function getServerClient(event: any) {
  const config = useRuntimeConfig(event)
  const url = config.public.supabase.url
  const key = config.public.supabase.key

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => parseCookieHeader(getHeader(event, "cookie") ?? ""),
      setAll: (cookies: any[], headers: any) => {
        headers?.forEach(({ name, value, options }: any) => {
          setHeader(event, "set-cookie", serialize(name, value, options))
        })
      },
    },
  })

  return client
}

export async function getServerUser(event: any) {
  const client = await getServerClient(event)
  const { data } = await client.auth.getSession()
  return data?.session?.user ?? null
}

export async function getAuthedClient(event: any) {
  const config = useRuntimeConfig(event)
  const url = config.public.supabase.url
  const key = config.public.supabase.key

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => parseCookieHeader(getHeader(event, "cookie") ?? ""),
      setAll: (cookies: any[], headers: any) => {
        headers?.forEach(({ name, value, options }: any) => {
          setHeader(event, "set-cookie", serialize(name, value, options))
        })
      },
    },
  })

  const { data } = await client.auth.getSession()
  if (data?.session?.access_token) {
    const authedClient = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      },
    })
    return authedClient
  }

  return client
}
