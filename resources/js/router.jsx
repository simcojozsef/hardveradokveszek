import React from 'react';
import { createBrowserRouter } from 'react-router';

import Home from './pages/Home';
import Store from './pages/Store';
import Product from './pages/Product';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminStores from './pages/admin/Stores';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminRefunds from './pages/admin/Refunds';
import AdminLogs from './pages/admin/Logs';
import AdminAnalytics from './pages/admin/Analytics';
import AdminCategories from './pages/admin/Categories';

import SellerDashboard from './pages/seller/Dashboard';
import SellerProducts from './pages/seller/Products';
import CreateProduct from './pages/seller/CreateProduct';
import EditProduct from './pages/seller/EditProduct';
import SellerStore from './pages/seller/Store';
import CreateStore from './pages/seller/CreateStore';
import SellerOrders from './pages/seller/Orders';

import BuyerDashboard from './pages/buyer/Dashboard';
import BuyerCart from './pages/buyer/Cart';
import BuyerCheckout from './pages/buyer/Checkout';

import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import SellerLayout from './layouts/seller/SellerLayout';

import Marketplace from './pages/Marketplace';
import Category from './pages/Category';


export const router = createBrowserRouter([
    {
        element: <PublicLayout />,
        children: [
            {
                path: '/',
                element: <Home />,
            },
            {
                path: '/store/:slug',
                element: <Store />,
            },
            {
                path: '/product/:id',
                element: <Product />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/register',
                element: <Register />,
            },
            {
                path: '/:categoryPath/*',
                element: <Category />,
            },
            {
                path: '/marketplace',
                element: <Marketplace />,
            },
            {
                path: '/seller',
                element: (
                    <ProtectedRoute roles={['seller']}>
                        <SellerLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <SellerDashboard />,
                    },
                    {
                        path: 'products',
                        element: <SellerProducts />,
                    },
                    {
                        path: 'products/create',
                        element: <CreateProduct />,
                    },
                    {
                        path: 'products/:id/edit',
                        element: <EditProduct />,
                    },
                    {
                        path: 'store',
                        element: <SellerStore />,
                    },
                    {
                        path: 'store/create',
                        element: <CreateStore />,
                    },
                    {
                        path: 'orders',
                        element: <SellerOrders />,
                    },
                ],
            },
            {
                path: '/buyer',
                element: (
                    <ProtectedRoute roles={['buyer']}>
                        <BuyerDashboard />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/buyer/cart',
                element: (
                    <ProtectedRoute roles={['buyer']}>
                        <BuyerCart />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/buyer/checkout',
                element: (
                    <ProtectedRoute roles={['buyer']}>
                        <BuyerCheckout />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/admin',
                element: (
                    <ProtectedRoute roles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <AdminDashboard />,
                    },
                    {
                        path: 'users',
                        element: <AdminUsers />,
                    },
                    {
                        path: 'stores',
                        element: <AdminStores />,
                    },
                    {
                        path: 'products',
                        element: <AdminProducts />,
                    },
                    {
                        path: 'orders',
                        element: <AdminOrders />,
                    },
                    {
                        path: 'refunds',
                        element: <AdminRefunds />,
                    },
                    {
                        path: 'logs',
                        element: <AdminLogs />,
                    },
                    {
                        path: 'analytics',
                        element: <AdminAnalytics />,
                    },
                    {
                        path: 'categories',
                        element: <AdminCategories />,
                    },
                ],
            },
        ],
    },
]);