# CommerceFlow Production Deployment Guide

This guide details the complete configuration required to deploy CommerceFlow to production using GitHub and Vercel.

---

## 1. Step-by-Step GitHub Setup

To prepare the codebase for integration with Vercel and CI/CD:

1. **Create the GitHub Repository**:
   - Go to [GitHub](https://github.com) and log in.
   - Click the **New** button to create a new repository.
   - Set the Repository Name to `Commerce_Flow` (or match your preferred naming scheme).
   - Keep the repository **Public** or **Private** based on your team's access requirements.
   - **Do not** initialize the repository with a README, `.gitignore`, or license (the local project already contains these).
   - Click **Create repository**.

2. **Initialize Local Git and Set Remote**:
   Open a terminal in the root of your local project and run:
   ```bash
   # Add the new remote URL to point to Commerce_Flow
   git remote set-url origin https://github.com/Dhruv311boop/Commerce_Flow.git
   
   # Or if you are setting up a fresh local repository:
   # git init
   # git remote add origin https://github.com/Dhruv311boop/Commerce_Flow.git
   ```

3. **Stage, Commit, and Push Changes**:
   ```bash
   # Add all files (the updated .gitignore will exclude secret and build folders)
   git add .
   
   # Create a meaningful commit
   git commit -m "chore: setup production-ready build, Vercel configs, and CI/CD workflows"
   
   # Push the codebase to GitHub
   git branch -M main
   git push -u origin main
   ```

---

## 2. Step-by-Step Vercel Setup

Once the code is on GitHub, deploy it to Vercel:

1. **Sign in to Vercel**:
   - Visit [Vercel](https://vercel.com) and log in using your GitHub account.

2. **Import the Project**:
   - Click **Add New** → **Project**.
   - Under "Import Git Repository", find your `Commerce_Flow` repository and click **Import**.

3. **Configure Project Settings**:
   - Vercel automatically detects the Vite framework. Verify the preset configuration:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install` (or `npm ci`)

4. **Bind Environment Variables** (See Section 3 below).

5. **Deploy**:
   - Click the **Deploy** button. Vercel will build your static frontend assets and provision serverless functions in the `api/` directory.
   - Once completed, you will receive a public Vercel deployment URL (e.g., `https://commerce-flow.vercel.app`).

---

## 3. Environment Variable Configuration

CommerceFlow relies on specific environment variables to enable AI mapping and analytics features.

Configure the following variables in the **Vercel Dashboard** under **Project Settings → Environment Variables**:

| Variable Name | Description | Recommended Production Value |
|---|---|---|
| `VITE_APP_ENV` | Application environment indicator. | `production` |
| `VITE_OPENAI_API_KEY` | OpenAI API key for AI mapping assistant. | `sk-proj-...` |

*Note: Environment variables prefixed with `VITE_` are automatically bundled and exposed to the client browser at build-time.*

---

## 4. Domain Configuration

To map a custom domain name (e.g., `commerceflow.yourcompany.com`) to your Vercel deployment:

1. In the Vercel dashboard, go to your project page.
2. Click **Settings** (top navigation tab) → **Domains** (left sidebar menu).
3. Enter your custom domain name and click **Add**.
4. Vercel will provide the DNS records required:
   - For apex domains (e.g., `example.com`), add an **A record** pointing to `76.76.21.21`.
   - For subdomains (e.g., `app.example.com`), add a **CNAME record** pointing to `cname.vercel-dns.com`.
5. Update these DNS records in your domain registrar's configuration panel (e.g., GoDaddy, Cloudflare, Namecheap).
6. Vercel will automatically verify the records and issue a free SSL certificate.

---

## 5. Rollback Procedure

If a bad build makes it to production and you need to restore the service immediately:

1. Go to your project page in Vercel.
2. Click on the **Deployments** tab.
3. Locate the last known working deployment (successful build from a previous commit).
4. Click the **three dots (...)** next to that deployment and select **Promote to Production**.
5. Vercel will immediately route traffic back to the older build (rollback takes less than 5 seconds and requires no rebuild).
6. To make the rollback permanent, revert the broken commit locally on Git:
   ```bash
   # Revert the broken commit
   git revert HEAD
   # Push changes back to main to verify clean CI build
   git push origin main
   ```
