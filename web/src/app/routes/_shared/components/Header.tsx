import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ListBulletIcon,
  HomeIcon,
  FolderIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/app/features/auth";

type NavItem = {
  readonly name: string;
  readonly path: string;
  readonly icon: typeof HomeIcon;
};

const navItems: NavItem[] = [
  { name: "ホーム", path: "/", icon: HomeIcon },
  { name: "TODO", path: "/todos", icon: ListBulletIcon },
  { name: "プロジェクト", path: "/projects", icon: FolderIcon },
  { name: "プロフィール", path: "/profile", icon: UserCircleIcon },
];

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
  };

  return (
    <header className="bg-white shadow-md border-b border-border-light">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 text-text-primary hover:text-primary-600 transition-colors"
          >
            <ListBulletIcon className="h-8 w-8" />
            <span className="text-xl font-bold">TODO App</span>
          </Link>

          {/* Navigation and Logout */}
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-md
                      transition-colors duration-200
                      ${
                        isActive
                          ? "bg-primary-100 text-text-primary"
                          : "text-text-primary hover:text-text-tertiary"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-md text-text-primary hover:text-text-tertiary transition-colors duration-200"
              aria-label="ログアウト"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
