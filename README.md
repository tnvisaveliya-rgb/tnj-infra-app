# T&J Infra - CRM & Employee Management System

A modern React application built with Vite, Supabase, and TailwindCSS for managing customer relationships and employee data.

## Features

- **Dashboard**: Overview of key metrics and statistics
- **Employee Management**: Comprehensive employee directory and management tools
- **CRM**: Customer relationship management with lead tracking and sales pipeline
- **Supabase Integration**: Secure backend with real-time database capabilities
- **Modern UI**: Clean, responsive interface built with TailwindCSS

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase
- **Routing**: React Router DOM
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase project (create one at [supabase.com](https://supabase.com))

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd "d:/tnjinfra app"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   
   Create a Supabase project at [supabase.com](https://supabase.com) and get your credentials:
   - Go to your Supabase project settings
   - Find your Project URL and Anon Key
   - Update the `.env` file with your credentials:
   
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will open at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
tnjinfra-app/
├── src/
│   ├── components/      # Reusable components
│   │   └── Layout.jsx  # Main layout with sidebar
│   ├── pages/          # Page components
│   │   ├── Dashboard.jsx
│   │   ├── EmployeeManagement.jsx
│   │   └── CRM.jsx
│   ├── lib/            # Utilities and configurations
│   │   └── supabase.js # Supabase client configuration
│   ├── App.jsx         # Main app component with routing
│   ├── main.jsx        # Application entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # TailwindCSS configuration
├── postcss.config.js   # PostCSS configuration
└── package.json        # Project dependencies

```

## Supabase Setup

### Database Tables

You'll need to create the following tables in your Supabase project:

#### Employees Table
```sql
CREATE TABLE employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(50),
  position VARCHAR(50),
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Clients Table
```sql
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'prospect',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Adding New Features

1. Create new page components in `src/pages/`
2. Add routes in `src/App.jsx`
3. Update navigation in `src/components/Layout.jsx`
4. Add Supabase queries in `src/lib/supabase.js` or create new service files

### Environment Variables

Copy `.env.example` to `.env` and update with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please contact the development team.
