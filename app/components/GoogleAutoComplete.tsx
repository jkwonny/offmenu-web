import { useLoadScript, Autocomplete, Libraries } from "@react-google-maps/api";
import { useRef } from "react";
import { VenueFormData } from "@/app/types/venue";

const libraries: Libraries = ["places"];

interface GoogleAutoCompleteProps {
    formData: VenueFormData;
    setFormData: React.Dispatch<React.SetStateAction<VenueFormData>>;
}

export default function GoogleAutoComplete({ formData, setFormData }: GoogleAutoCompleteProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
        libraries,
    });

    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handlePlaceChanged = () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.geometry) return;

        console.log("Place:", place);

        const lat = place.geometry.location?.lat();
        const lng = place.geometry.location?.lng();

        // Extract address components
        let street_number = "";
        let street_name = "";
        let neighborhood = "";
        let city = "";
        let state = "";
        let postal_code = "";
        let borough = "";

        if (place.address_components) {
            for (const component of place.address_components) {
                const componentType = component.types[0];

                switch (componentType) {
                    case "street_number":
                        street_number = component.long_name;
                        break;
                    case "route":
                        street_name = component.long_name;
                        break;
                    case "neighborhood":
                        neighborhood = component.long_name;
                        break;
                    case "sublocality_level_1":
                    case "sublocality":
                        // In NYC, the borough (Brooklyn, Manhattan, etc.) is the sublocality
                        borough = component.long_name;
                        break;
                    case "locality":
                        city = component.long_name;
                        break;
                    case "administrative_area_level_1":
                        state = component.short_name;
                        break;
                    case "postal_code":
                        postal_code = component.long_name;
                        break;
                }
            }
        }

        // For NYC addresses, use the borough as the city if city is empty or "New York"
        if ((city === "" || city === "New York") && borough && state === "NY") {
            city = borough;
        }

        // If we still don't have a neighborhood, use the borough as fallback
        if (!neighborhood && borough) {
            neighborhood = borough;
        }

        if (lat !== undefined && lng !== undefined) {
            setFormData({
                ...formData,
                latitude: lat.toString(),
                longitude: lng.toString(),
                address: place.formatted_address || "",
                street_number,
                street_name,
                neighborhood: neighborhood || "",
                city: city || "",
                state: state || "NY",
                postal_code
            });
            console.log("Selected:", place.formatted_address, lat, lng);
            console.log("Address components:", {
                street_number,
                street_name,
                neighborhood,
                city,
                state,
                postal_code
            });
        }
    };

    return !isLoaded ? (
        <div>Loading...</div>
    ) : (
        <Autocomplete
            onLoad={(auto) => {
                autocompleteRef.current = auto;

                // Optional: bias to NYC bounds
                const nyBounds = new google.maps.LatLngBounds(
                    new google.maps.LatLng(40.4774, -74.2591), // southwest
                    new google.maps.LatLng(40.9176, -73.7004)  // northeast
                );
                auto.setBounds(nyBounds);
                auto.setOptions({
                    componentRestrictions: { country: "us" },
                    fields: ["formatted_address", "geometry", "address_components"],
                    types: ["address"],
                });
            }}
            onPlaceChanged={handlePlaceChanged}
        >
            <input
                ref={inputRef}
                type="text"
                placeholder="Enter venue address"
                className="input w-full p-2 border rounded-md"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
        </Autocomplete>
    );
}
