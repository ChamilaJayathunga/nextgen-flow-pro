# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.box_version = "20250320.0.0"
  config.vm.hostname = "nextgen-flow-pro"

  config.vm.network "private_network", ip: "192.168.56.10"

  config.vm.network "forwarded_port", guest: 3000, host: 3000, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 4000, host: 4000, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 5432, host: 5432, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 6379, host: 6379, host_ip: "127.0.0.1"

  config.vm.provider "virtualbox" do |vb|
    vb.name = "nextgen-flow-pro"
    vb.memory = "4096"
    vb.cpus = 2
    vb.gui = false
  end

  config.vm.synced_folder ".", "/opt/nextgen-flow-pro", type: "rsync",
    rsync__exclude: [
      ".git/",
      "node_modules/",
      "backend/node_modules/",
      "frontend/node_modules/",
      "backend/dist/",
      "frontend/.next/",
      ".env",
      ".vagrant/"
    ],
    rsync__args: ["--verbose", "--archive", "--delete", "-z"]

  config.vm.provision "shell", inline: <<-SHELL
    set -e

    # Remove any old Docker versions
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
      apt-get remove -y $pkg 2>/dev/null || true
    done

    # Install prerequisites
    apt-get update
    apt-get install -y ca-certificates curl gnupg git make

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
      gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add vagrant user to docker group
    usermod -aG docker vagrant

    # Install node exporter for monitoring (optional)
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs 2>/dev/null || true

    # Create project directory
    mkdir -p /opt/nextgen-flow-pro

    echo "Provisioning complete!"
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker compose version)"
  SHELL

  config.trigger.after :up do |trigger|
    trigger.name = "Sync and deploy"
    trigger.run_remote = { inline: <<-SHELL
      cd /opt/nextgen-flow-pro
      if [ -f .env ]; then
        echo "Starting services..."
        docker compose -f docker/docker-compose.yml up --detach --build
      else
        echo "No .env file found. Copy .env.example to .env and run:"
        echo "  docker compose -f docker/docker-compose.yml up --detach --build"
      fi
    SHELL
    }
  end

  config.trigger.after :destroy do |trigger|
    trigger.name = "Cleanup Docker"
    trigger.run_remote = { inline: <<-SHELL
      cd /opt/nextgen-flow-pro
      docker compose -f docker/docker-compose.yml down --volumes --remove-orphans 2>/dev/null || true
    SHELL
    }
  end
end
