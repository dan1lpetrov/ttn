'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TTNContextType {
    selectedSenderId: string | null;
    selectedClientId: string | null;
    setSelectedSenderId: (id: string | null) => void;
    setSelectedClientId: (id: string | null) => void;
}

const TTNContext = createContext<TTNContextType | undefined>(undefined);

export function TTNProvider({ children }: { children: ReactNode }) {
    const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    return (
        <TTNContext.Provider value={{
            selectedSenderId,
            selectedClientId,
            setSelectedSenderId,
            setSelectedClientId,
        }}>
            {children}
        </TTNContext.Provider>
    );
}

export function useTTN() {
    const context = useContext(TTNContext);
    if (context === undefined) {
        throw new Error('useTTN must be used within a TTNProvider');
    }
    return context;
}

