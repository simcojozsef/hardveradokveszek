import React from 'react';
import { Outlet } from 'react-router';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PublicLayout() {
    return (
        <div className="app-layout">
            {/*
             * Ambient backdrop: a very light tinted wash plus a soft brand
             * glow at the top. Purely decorative, sits behind all content.
             */}
            <div className="app-layout__backdrop" aria-hidden="true" />

            <Navbar />

            <main className="app-layout__content">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}