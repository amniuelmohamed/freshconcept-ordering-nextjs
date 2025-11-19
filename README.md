# Fresh Concept Ordering Portal

A modern, multilingual B2B wholesale food distribution platform built with Next.js 16, Supabase, and TypeScript. This platform enables businesses to manage their wholesale operations with separate interfaces for clients (restaurants, supermarkets, etc.) and employees who manage the platform.

## Features

### For Clients
- **Quick Order System**: Intuitive grid and table views for placing orders
- **Product Catalog**: Browse products with role-based visibility (supermarkets see wholesale products, restaurants see restaurant products)
- **Shopping Cart**: Add products with quantities, modify quantities, and checkout
- **Order History**: View past orders with filters (status, date, order ID) and sorting options
- **Favorites**: Save frequently ordered products for quick access
- **Personalized Pricing**: Automatic discount application based on client profile
- **Dashboard**: Real-time statistics, next delivery date, pending orders tracking

### For Employees
- **Client Management**: Create and manage client accounts with personalized settings
- **Product Management**: Full CRUD operations for products and categories
- **Order Management**: View, filter, and update order statuses with date filtering
- **Employee Management**: Manage employee accounts and roles
- **Role-Based Permissions**: Configurable permissions system for different employee roles
- **Analytics Dashboard**: Comprehensive statistics with charts (order trends, category distribution, status overview)
- **Settings**: Configure platform settings (available languages, units, permissions, cutoff times)

### Platform Features
- **Multilingual Support**: French, English, and Dutch with configurable available languages
- **Dynamic Pricing**: Client-specific discounts and role-based product visibility
- **Order Auto-Confirmation**: Automatic confirmation of orders past deadline
- **Delivery Scheduling**: Fixed delivery days per client with cutoff time management
- **Global Search**: Quick search across products, orders, clients, and more
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS v4
- **Secure Authentication**: Supabase Auth with role-based access control
- **Responsive Design**: Mobile-first approach with smooth animations and transitions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Internationalization**: next-intl
- **Charts**: Recharts
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 22+ 
- npm or yarn
- Supabase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd freshconcept_ordering_portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Set up the Supabase database:
   - Create a new Supabase project
   - Set up the database schema (tables, relationships, triggers)
   - Configure Row Level Security (RLS) policies
   - Set up storage buckets for product images
   - Note: The database schema and RLS policies need to be set up manually or via SQL migrations

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── [locale]/     # Localized routes
│   │   │   ├── (auth)/   # Authentication pages
│   │   │   ├── (client)/ # Client-facing pages
│   │   │   └── (employee)/ # Employee-facing pages
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── client/       # Client-specific components
│   │   ├── employee/     # Employee-specific components
│   │   └── shared/       # Shared components
│   ├── lib/              # Utility functions and helpers
│   │   ├── auth/         # Authentication logic
│   │   ├── data/         # Data fetching functions
│   │   └── utils/        # Utility functions
│   ├── messages/         # Translation files (i18n)
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── proxy.ts             # Next.js proxy (formerly middleware.ts)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `.env.example` for required environment variables.

## Database Setup

This project uses Supabase as the backend. The database schema includes:

### Key Tables
- **clients**: Customer profiles with delivery schedules and discounts
- **employees**: Staff profiles with roles and permissions
- **products**: Product catalog with multilingual names and role-based visibility
- **orders**: Order headers with status tracking
- **order_items**: Order line items with quantity and pricing
- **categories**: Product categories with translations
- **client_roles**: Dynamic client role definitions (e.g., "Supermarket", "Restaurant")
- **employee_roles**: Employee roles with permission sets
- **settings**: Platform configuration (languages, units, permissions, cutoff times)
- **favorites**: Client's favorited products

### Important Notes
- The database schema, RLS policies, and triggers should be configured in Supabase
- Row Level Security (RLS) is essential for data isolation
- Storage buckets are required for product images
- Service role key is needed for admin operations (user creation, etc.)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Submit a pull request

## License

Proprietary - All rights reserved

## Key Business Rules

- **No Public Registration**: Only employees can create client and employee accounts
- **Role-Based Product Visibility**: Products are visible based on client roles (supermarkets vs restaurants)
- **Dynamic Pricing**: Each client has a personalized discount percentage
- **Estimated Totals**: Orders show estimated totals until actual weighing
- **Fixed Delivery Schedules**: Each client has specific delivery days (e.g., Monday, Wednesday, Friday)
- **Order Cutoff Times**: Orders must be placed before a configurable cutoff time
- **Auto-Confirmation**: Orders past their deadline are automatically confirmed

## Support

For issues and questions, please open an issue on GitHub.
