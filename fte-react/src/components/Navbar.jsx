import { faCircleUser } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAtom } from "jotai";
// import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "@/api/axios";
import { isAuthenticated } from "@/atoms/Atom";
import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuIndicator,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

export default function Navbar() {
    // const [isOpen, setIsOpen] = useState(false);
    const [isAuth, setIsAuth] = useAtom(isAuthenticated);
    const navigate = useNavigate();

    // function navItemClicked() {
    //     setIsOpen(false);
    // }

    async function handleLogout() {
        try {
            await api.get("/auth/logout");
            setIsAuth(false);
            navigate("/");
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <nav className="w-full h-14 bg-green-800 px-4 flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center w-1/3">
                <Link to="/" className="font-bold text-white text-2xl">
                    FinTrackEasy
                </Link>
            </div>

            {/* Center: Authenticated-only Links */}
            {isAuth && (
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    <NavigationMenu className="hidden md:flex justify-center">
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link
                                        to="/overview"
                                        className="text-white px-4 py-2 hover:text-gray-300 hover:bg-transparent"
                                    >
                                        Overview
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link
                                        to="/transactions"
                                        className="text-white px-4 py-2 hover:text-gray-300 hover:bg-transparent"
                                    >
                                        Transactions
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link
                                        to="/budgets"
                                        className="text-white px-4 py-2 hover:text-gray-300 hover:bg-transparent"
                                    >
                                        Budgets
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            )}

            {/* Right: Guest Links or User Icon */}
            {!isAuth ? (
                <NavigationMenu className="hidden md:flex justify-end items-center gap-x-6">
                    <NavigationMenuList className="flex gap-x-6">
                        <NavigationMenuItem>
                            <Button asChild variant="link">
                                <Link to="/" className="px-3 py-2 text-white">
                                    Home
                                </Link>
                            </Button>
                        </NavigationMenuItem>

                        <NavigationMenuItem>
                            <Button asChild variant="link">
                                <Link
                                    to="/about"
                                    className="px-3 py-2 text-white hover:text-gray-300"
                                >
                                    About Us
                                </Link>
                            </Button>
                        </NavigationMenuItem>

                        <NavigationMenuItem>
                            <Button asChild variant="link">
                                <Link
                                    to="/contact"
                                    className="px-3 py-2 text-white hover:text-gray-300"
                                >
                                    Contact
                                </Link>
                            </Button>
                        </NavigationMenuItem>

                        <NavigationMenuItem>
                            <NavigationMenuLink asChild>
                                <Link
                                    to="/login"
                                    className="px-3 py-2 border border-white rounded hover:bg-white hover:text-green-800 transition"
                                >
                                    Log In
                                </Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>

                        <NavigationMenuItem>
                            <NavigationMenuLink asChild>
                                <Link
                                    to="/register"
                                    className="px-3 py-2 border border-white rounded hover:bg-white hover:text-green-800 transition"
                                >
                                    Sign Up
                                </Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            ) : (
                <NavigationMenu className="hidden md:flex justify-end items-center">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="bg-transparent text-white hover:bg-transparent hover:text-gray-300">
                                <FontAwesomeIcon icon={faCircleUser} className="text-2xl" />
                            </NavigationMenuTrigger>

                            <NavigationMenuContent>
                                <ul className="gap-4">
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <Link to="/profile" className="flex items-center gap-2">
                                                Settings
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink asChild>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 w-full text-left px-4 py-2"
                                            >
                                                Logout
                                            </button>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            )}
        </nav>
    );
}
