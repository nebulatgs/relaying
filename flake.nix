{
  description = "Devshell for relaying.cloud";

  inputs.nixpkgs.url = github:NixOS/nixpkgs;
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          devShells.default = with pkgs; mkShell {
            buildInputs = [
              nodePackages.pnpm
              nodejs
            ];
          };
        }
      );
}
