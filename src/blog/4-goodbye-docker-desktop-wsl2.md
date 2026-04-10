---
seoTitle: Run Docker Natively on Windows with WSL2
slug: goodbye-docker-desktop-wsl2
tag: DevOps · Windows
title: Goodbye Docker Desktop: Run Linux & Docker Natively on Windows with WSL2
subtitle: How we eliminated Docker Desktop from our Windows machines and got native Linux performance without leaving Windows.
date: May 5, 2025
readTime: 8 min read
mediumUrl: https://arg-software.medium.com/goodbye-docker-desktop-run-linux-docker-natively-on-windows-with-wsl2-178ebb1deb51
excerpt: At ARG, our development team works across different operating systems. For our Windows developers, we found a way to run the same Linux-based tools and containers natively — without Docker Desktop consuming excessive resources.
---

![Goodbye-WSL](/images/blog/goodbye-wsl/goodbye-wsl-header.webp)

At ARG, our development team works across different operating systems - some prefer macOS, others Linux, and many use Windows. This diverse setup created a challenge: how to maintain a consistent development environment across all platforms?

For our Windows developers, this meant finding a way to run the same Linux-based tools and containers that our Linux team members use natively. Windows Subsystem for Linux (WSL) has been our answer, providing a bridge between platforms.

The best part of our solution? We've eliminated the need for Docker Desktop, which was consuming excessive resources on our Windows machines and slowing development. This guide shares our approach to setting up WSL2 and installing Docker directly inside WSL - giving you the same performance our Linux developers enjoy, but without leaving Windows. We'll also show you how to set up Portainer as a lightweight yet powerful alternative to Docker Desktop's resource-heavy GUI.

## What's WSL All About?

WSL lets you run a full Linux environment directly on Windows, no virtual machine or dual-boot required. There are two versions worth knowing about:

- **WSL 1.** Translates Linux system calls to Windows. It's faster for accessing files but has limited compatibility with container tools.
- **WSL 2.** Uses a lightweight VM with a full Linux kernel. This offers excellent compatibility with modern tools like Docker and Kubernetes.

Our recommendation? Go with WSL 2 - it's the default now for good reason and supports all the modern Linux tools you'll need. As Microsoft explains in its official documentation, WSL 2 provides a full Linux kernel experience right within Windows, making it perfect for container development.

![WSL version comparison](/images/blog/goodbye-wsl/setting-up-wsl.webp)

## Setting Up WSL on Windows 10/11

Getting WSL up and running is straightforward. Open PowerShell as Administrator and run:

```bash
wsl --install
```

Want to see what other distros are available?

```bash
wsl --list --online
```

![List of distros available](/images/blog/goodbye-wsl/distros-list.webp)

To install a specific one (e.g., Debian):

```bash
wsl --install -d Debian
```

Once installed, set your default distro:

```bash
wsl --set-default <DistributionName>
```

## Why Skip Docker Desktop?

### The Architectural Sandwich Problem

Docker Desktop implements a very complex architecture. It runs in a separate, isolated environment with its own Linux VM using LinuxKit, creating an additional virtualization layer that slows everything down. While Docker Desktop uses WSL2's dynamic memory allocation, it adds its own resource management systems that control how the Docker daemon interacts with the host system. Docker Desktop also runs in a separate distro and isolated namespace, requiring API proxies to translate paths between your user distro and the LinuxKit container.

### File System Performance Issues

One of the biggest bottlenecks comes from how Docker Desktop handles file system operations. When mounting Windows-based files into containers, there's significant performance degradation compared to keeping volumes inside WSL2. Docker Desktop uses cross-distro bindings to expose the daemon to your user distro and access your files from its contained environment, adding overhead to every file operation.

### Memory Consumption

The multi-layered approach of Docker Desktop is hungry for resources. Running Docker directly in WSL2 without Docker Desktop has been observed to use up to five times less memory in some tests. Docker Desktop also doesn't handle memory reclamation as efficiently, often leaving large amounts of memory tied up in the Linux kernel's page cache.

### Real-World Performance Differences

The numbers don't lie. Real-world tests have shown operations taking more than triple the time on Docker Desktop compared to native Docker, even when the native environment had fewer resources. Native Docker in WSL2 starts almost instantly, while Docker Desktop has a longer initialization process due to its additional management layers.

## Installing Docker in WSL

Based on the latest best practices, here's how to install Docker directly in your WSL environment:

```bash
# 1. Update and install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

# 2. Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. Set up Docker's repository
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker packages
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Start Docker service
sudo service docker start

# 6. Optional: Allow Docker commands without sudo
sudo usermod -aG docker $USER
```

Log out and back into your WSL terminal (or restart the terminal) for group changes to take effect. Then test Docker:

```bash
docker run hello-world
```

If you see the "Hello from Docker!" message, you're ready to go.

Important note: As mentioned in the detailed installation guide by Jonathan Bowman, the iptables configuration is crucial for Docker networking to function properly in WSL. Without this step, container networking might fail.

## Installing Portainer: A GUI for Docker

If you like visual tools for managing containers, Portainer is a lightweight alternative to Docker Desktop's interface:

```bash
# Create a Docker volume for Portainer data
docker volume create portainer_data

# Run the Portainer container
docker run -d -p 8000:8000 -p 9443:9443 --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Open your browser and go to http://localhost:9443 to access the Portainer interface. You'll be prompted to create an admin user on the first login.

![Portainer Login Screen](/images/blog/goodbye-wsl/portainer-login.webp)

![Portainer environment](/images/blog/goodbye-wsl/portainer-environment.webp)

Developer tip: Portainer makes container management visual and intuitive. According to many developers working with WSL2, the combination of native Docker and Portainer provides most of the functionality of Docker Desktop without the resource overhead.

## Optional: Tune WSL2 Performance with .wslconfig

By default, WSL2 can consume significant system resources depending on what you're running. You can control memory, CPU usage, and whether Linux GUI apps are supported by editing the .wslconfig file.

Create .wslconfig in your Windows user folder at C:\Users\<YourUsername>\.wslconfig and add the following configuration:

```ini
[wsl2]
memory=4GB
processors=2
guiApplications=false
```

![WSL config settings](/images/blog/goodbye-wsl/wsl-config-settings.webp)

To apply the configuration, run:

```bash
wsl --shutdown
```

This stops all WSL instances and reloads the .wslconfig settings on the next launch.

## Wrapping Up

You now have the best of both worlds - Windows for your desktop needs and a true Linux environment for development. This setup runs leaner and faster than Docker Desktop, especially on machines with limited resources.

The beauty of this approach is that you're running Docker the same way you would on a Linux server, making your development environment more closely match production. With Portainer, you still get a clean web interface for managing your containers without the overhead of Docker Desktop.

Happy coding across platforms! Follow us for more developer tips and development guides.
