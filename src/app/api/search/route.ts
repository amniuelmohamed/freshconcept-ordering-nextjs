import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

interface SearchResult {
  id: string;
  type: "product" | "order" | "client" | "favorite" | "employee" | "category";
  title: string;
  subtitle?: string;
  href: string;
  relevance?: number; // For sorting by relevance
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const userType = searchParams.get("type") || "client";
    const locale = searchParams.get("locale") || "fr";

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    if (userType === "client" && session.clientProfile) {
      const clientId = session.clientProfile.id;

      // Search products - ENHANCED with name, description, and category
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, name, description, base_price, category_id, categories(name)")
        .eq("active", true)
        .limit(20); // Get more results for filtering

      if (products) {
        products.forEach((product) => {
          const name = product.name as { fr?: string; nl?: string; en?: string };
          const description = product.description as { fr?: string; nl?: string; en?: string } | null;
          const categoryName = product.categories ? (product.categories as { name: { fr?: string; nl?: string; en?: string } }).name : null;
          
          const localizedName = name[locale as keyof typeof name] || name.fr || name.nl || name.en || product.sku || "Unknown";
          const localizedDescription = description ? (description[locale as keyof typeof description] || description.fr || description.nl || description.en || "") : "";
          const localizedCategory = categoryName ? (categoryName[locale as keyof typeof categoryName] || categoryName.fr || categoryName.nl || categoryName.en || "") : "";
          
          // Calculate relevance score (higher = better match)
          let relevance = 0;
          const sku = (product.sku || "").toLowerCase();
          
          // Exact SKU match = highest priority
          if (sku === lowerQuery) relevance = 100;
          // SKU starts with query
          else if (sku.startsWith(lowerQuery)) relevance = 90;
          // SKU contains query
          else if (sku.includes(lowerQuery)) relevance = 80;
          // Name exact match
          else if (localizedName.toLowerCase() === lowerQuery) relevance = 70;
          // Name starts with query
          else if (localizedName.toLowerCase().startsWith(lowerQuery)) relevance = 60;
          // Name contains query
          else if (localizedName.toLowerCase().includes(lowerQuery)) relevance = 50;
          // Category match
          else if (localizedCategory.toLowerCase().includes(lowerQuery)) relevance = 40;
          // Description contains query
          else if (localizedDescription.toLowerCase().includes(lowerQuery)) relevance = 30;
          
          // Only include if there's a match
          if (relevance > 0) {
            results.push({
              id: product.id,
              type: "product",
              title: localizedName,
              subtitle: `${product.sku || ""} - €${Number(product.base_price).toFixed(2)}/kg`,
              href: `/${locale}/quick-order?search=${product.sku || ""}`,
              relevance,
            });
          }
        });
      }

      // Search orders - ENHANCED with date and status search
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, delivery_date, status, final_total, estimated_total")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (orders) {
        orders.forEach((order) => {
          let relevance = 0;
          const orderId = order.id.toLowerCase();
          const orderStatus = (order.status || "").toLowerCase();
          const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString(locale) : "";
          const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(locale) : "";
          
          // ID match
          if (orderId.includes(lowerQuery)) relevance = 100;
          // Status match
          else if (orderStatus.includes(lowerQuery)) relevance = 80;
          // Date match
          else if (createdDate.includes(query) || deliveryDate.includes(query)) relevance = 70;
          
          if (relevance > 0) {
            const total = order.final_total || order.estimated_total || 0;
            results.push({
              id: order.id,
              type: "order",
              title: `Order #${order.id.slice(0, 8)}`,
              subtitle: `${order.status} - €${Number(total).toFixed(2)}`,
              href: `/${locale}/orders/${order.id}`,
              relevance,
            });
          }
        });
      }

      // Search favorites - ENHANCED
      const { data: favorites } = await supabase
        .from("favorites")
        .select("id, product_id, products(id, sku, name, base_price)")
        .eq("client_id", clientId)
        .limit(10);

      if (favorites) {
        favorites.forEach((fav) => {
          if (fav.products) {
            const product = fav.products as { id: string; sku: string; name: { fr?: string; nl?: string; en?: string }; base_price: number };
            const name = product.name;
            const localizedName =
              name[locale as keyof typeof name] || name.fr || name.nl || name.en || product.sku;
            
            let relevance = 0;
            const sku = (product.sku || "").toLowerCase();
            
            if (sku === lowerQuery) relevance = 90;
            else if (sku.includes(lowerQuery)) relevance = 80;
            else if (localizedName.toLowerCase().includes(lowerQuery)) relevance = 70;
            
            if (relevance > 0) {
              results.push({
                id: fav.id,
                type: "favorite",
                title: `⭐ ${localizedName}`,
                subtitle: `${product.sku} - €${Number(product.base_price).toFixed(2)}/kg`,
                href: `/${locale}/favorites`,
                relevance,
              });
            }
          }
        });
      }
    } else if (userType === "employee" && session.employeeProfile) {
      // Search clients - ENHANCED
      const { data: clients } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, contact_email, contact_phone, contact_mobile")
        .limit(20);

      if (clients) {
        clients.forEach((client) => {
          let relevance = 0;
          const companyName = (client.company_name || "").toLowerCase();
          const contactName = (client.contact_name || "").toLowerCase();
          const email = (client.contact_email || "").toLowerCase();
          const phone = (client.contact_phone || "").toLowerCase();
          const mobile = (client.contact_mobile || "").toLowerCase();
          
          // Company name exact match
          if (companyName === lowerQuery) relevance = 100;
          // Company name starts with
          else if (companyName.startsWith(lowerQuery)) relevance = 90;
          // Company name contains
          else if (companyName.includes(lowerQuery)) relevance = 80;
          // Contact name match
          else if (contactName.includes(lowerQuery)) relevance = 70;
          // Email match
          else if (email.includes(lowerQuery)) relevance = 60;
          // Phone match
          else if (phone.includes(query) || mobile.includes(query)) relevance = 50;
          
          if (relevance > 0) {
            results.push({
              id: client.id,
              type: "client",
              title: client.company_name || client.contact_name || "Unknown",
              subtitle: client.contact_email || "",
              href: `/${locale}/employee/clients/${client.id}`,
              relevance,
            });
          }
        });
      }

      // Search orders - ENHANCED with client name, date, and status
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, delivery_date, status, final_total, estimated_total, clients(company_name, contact_name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (orders) {
        orders.forEach((order) => {
          const client = order.clients as { company_name: string; contact_name: string } | null;
          const clientName = client?.company_name || client?.contact_name || "Unknown";
          
          let relevance = 0;
          const orderId = order.id.toLowerCase();
          const orderStatus = (order.status || "").toLowerCase();
          const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString(locale) : "";
          const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(locale) : "";
          
          // ID match
          if (orderId.includes(lowerQuery)) relevance = 100;
          // Client name match
          else if (clientName.toLowerCase().includes(lowerQuery)) relevance = 90;
          // Status match
          else if (orderStatus.includes(lowerQuery)) relevance = 80;
          // Date match
          else if (createdDate.includes(query) || deliveryDate.includes(query)) relevance = 70;
          
          if (relevance > 0) {
            const total = order.final_total || order.estimated_total || 0;
            results.push({
              id: order.id,
              type: "order",
              title: `Order #${order.id.slice(0, 8)}`,
              subtitle: `${clientName} - ${order.status} - €${Number(total).toFixed(2)}`,
              href: `/${locale}/employee/orders/${order.id}`,
              relevance,
            });
          }
        });
      }

      // Search products - ENHANCED with name, description, category (including inactive)
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, name, description, base_price, active, category_id, categories(name)")
        .limit(20);

      if (products) {
        products.forEach((product) => {
          const name = product.name as { fr?: string; nl?: string; en?: string };
          const description = product.description as { fr?: string; nl?: string; en?: string } | null;
          const categoryName = product.categories ? (product.categories as { name: { fr?: string; nl?: string; en?: string } }).name : null;
          
          const localizedName = name[locale as keyof typeof name] || name.fr || name.nl || name.en || product.sku || "Unknown";
          const localizedDescription = description ? (description[locale as keyof typeof description] || description.fr || description.nl || description.en || "") : "";
          const localizedCategory = categoryName ? (categoryName[locale as keyof typeof categoryName] || categoryName.fr || categoryName.nl || categoryName.en || "") : "";
          
          let relevance = 0;
          const sku = (product.sku || "").toLowerCase();
          
          // Exact SKU match
          if (sku === lowerQuery) relevance = 100;
          // SKU starts with
          else if (sku.startsWith(lowerQuery)) relevance = 90;
          // SKU contains
          else if (sku.includes(lowerQuery)) relevance = 80;
          // Name exact match
          else if (localizedName.toLowerCase() === lowerQuery) relevance = 70;
          // Name starts with
          else if (localizedName.toLowerCase().startsWith(lowerQuery)) relevance = 60;
          // Name contains
          else if (localizedName.toLowerCase().includes(lowerQuery)) relevance = 50;
          // Category match
          else if (localizedCategory.toLowerCase().includes(lowerQuery)) relevance = 40;
          // Description contains
          else if (localizedDescription.toLowerCase().includes(lowerQuery)) relevance = 30;
          
          if (relevance > 0) {
            const statusEmoji = product.active ? "✅" : "❌";
            results.push({
              id: product.id,
              type: "product",
              title: `${statusEmoji} ${localizedName}`,
              subtitle: product.sku || undefined,
              href: `/${locale}/employee/products/${product.id}`,
              relevance,
            });
          }
        });
      }

      // NEW: Search employees (name and role only - email is in auth.users, not accessible here)
      const { data: employees } = await supabase
        .from("employees")
        .select("id, full_name, employee_roles(name)")
        .limit(10);

      if (employees) {
        employees.forEach((employee) => {
          let relevance = 0;
          const fullName = (employee.full_name || "").toLowerCase();
          const roleName = employee.employee_roles ? 
            (employee.employee_roles as { name: { fr?: string; nl?: string; en?: string } }).name : null;
          const localizedRole = roleName ? 
            (roleName[locale as keyof typeof roleName] || roleName.fr || roleName.nl || roleName.en || "") : "";
          
          // Name exact match
          if (fullName === lowerQuery) relevance = 100;
          // Name starts with
          else if (fullName.startsWith(lowerQuery)) relevance = 90;
          // Name contains
          else if (fullName.includes(lowerQuery)) relevance = 80;
          // Role match
          else if (localizedRole.toLowerCase().includes(lowerQuery)) relevance = 70;
          
          if (relevance > 0) {
            results.push({
              id: employee.id,
              type: "employee",
              title: employee.full_name || "Unknown",
              subtitle: localizedRole || "",
              href: `/${locale}/employee/employees/${employee.id}`,
              relevance,
            });
          }
        });
      }

      // NEW: Search categories
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, description")
        .limit(10);

      if (categories) {
        categories.forEach((category) => {
          const name = category.name as { fr?: string; nl?: string; en?: string };
          const description = category.description as { fr?: string; nl?: string; en?: string } | null;
          
          const localizedName = name[locale as keyof typeof name] || name.fr || name.nl || name.en || "Unknown";
          const localizedDescription = description ? 
            (description[locale as keyof typeof description] || description.fr || description.nl || description.en || "") : "";
          
          let relevance = 0;
          
          // Name exact match
          if (localizedName.toLowerCase() === lowerQuery) relevance = 100;
          // Name contains
          else if (localizedName.toLowerCase().includes(lowerQuery)) relevance = 80;
          // Description contains
          else if (localizedDescription.toLowerCase().includes(lowerQuery)) relevance = 60;
          
          if (relevance > 0) {
            results.push({
              id: category.id,
              type: "category",
              title: `📁 ${localizedName}`,
              subtitle: localizedDescription.substring(0, 50) || undefined,
              href: `/${locale}/employee/categories/${category.id}`,
              relevance,
            });
          }
        });
      }
    }

    // Sort by relevance (higher first) and limit to top 10 results
    const sortedResults = results
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, 10);

    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

