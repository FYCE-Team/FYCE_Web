import {useLanguage} from "../../i18n/useLanguage.js";

import { useEffect, useRef } from "react";
import { useGoogleOAuth } from "@react-oauth/google";

// GIS has one configuration per page. Re-rendering a button must not initialize it again.
let initializedClient = null;
const listeners = new Map();
export default function GoogleSignInButton({ onSuccess, onError, width = 360, shape = "pill", theme = "outline", size = "large" }) {


    const {language}=useLanguage();
    const root = useRef(null);
    const callbacks = useRef({ onSuccess, onError });
    const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
    useEffect(() => { callbacks.current = { onSuccess, onError }; }, [onSuccess, onError]);
    useEffect(() => {
        if (!scriptLoadedSuccessfully || !clientId || !root.current) return;
        const gis = window.google?.accounts?.id;
        if (!gis) return;
        const element = root.current;
        listeners.set(element, callbacks);
        if (initializedClient !== clientId) {
            gis.initialize({ client_id: clientId, callback(response) {
                const active = [...listeners.values()].at(-1)?.current;
                if (response?.credential) active?.onSuccess(response);
                else active?.onError();
            } });
            initializedClient = clientId;
        }
        gis.renderButton(element, { type: "standard", locale: language, theme, size, shape, width });
        return () => { listeners.delete(element); element.replaceChildren(); };
    }, [clientId, scriptLoadedSuccessfully, theme, size, shape, width, language]);
    return <div ref={root} />;
}
