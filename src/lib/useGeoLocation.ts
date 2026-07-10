import { useEffect, useState } from "react"

export type GeoLocation = { lat: number; lng: number } | null

export function useGeoLocation(): GeoLocation {
  const [location, setLocation] = useState<GeoLocation>(null)

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocation(null)
      },
      { timeout: 5000, maximumAge: 60000 }
    )
  }, [])

  return location
}