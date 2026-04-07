// src/hooks/useProStatus.ts
import { useState, useEffect, useRef } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { loadIsPro, setIsPro } from '../storage';

export function isProFromInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active['pro'] !== 'undefined';
}

/**
 * Returns the current Pro status as a reactive boolean.
 * - Initialises from MMKV cache (synchronous, no flicker).
 * - Fires a RevenueCat getCustomerInfo() on mount to sync; if it fails,
 *   the cached value is kept.
 * - Subscribes to CustomerInfo updates so a completed purchase is reflected
 *   immediately without re-mounting. Purchase updates set
 *   purchasedThisSession so any in-flight launch-time check cannot overwrite.
 */
export function useProStatus(): boolean {
  const [isPro, setIsProState] = useState(loadIsPro());
  const purchasedThisSession = useRef(false);

  useEffect(() => {
    let mounted = true;

    Purchases.getCustomerInfo()
      .then(info => {
        if (!mounted || purchasedThisSession.current) return;
        const active = isProFromInfo(info);
        // Only sync from RevenueCat if it grants pro.
        // Never revoke locally — MMKV is the source of truth once unlocked.
        if (active) {
          setIsPro(true);
          setIsProState(true);
        }
      })
      .catch(() => { /* keep cached value */ });

    const onUpdate = (info: CustomerInfo) => {
      if (!mounted) return;
      const active = isProFromInfo(info);
      if (active) {
        purchasedThisSession.current = true;
        setIsPro(true);
        setIsProState(true);
      }
    };
    Purchases.addCustomerInfoUpdateListener(onUpdate);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    };
  }, []);

  return isPro;
}
