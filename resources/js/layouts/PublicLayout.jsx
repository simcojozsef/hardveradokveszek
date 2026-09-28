import React from 'react';
import { Outlet } from 'react-router';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PublicLayout() {
    return (
        <div className="app-layout">
            <Navbar />

            <main className="app-layout__content">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}