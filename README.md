# github

Tools do ThinkIac para GitHub, Git autenticado, repositórios, Issues e Pull Requests.

Repositório: https://github.com/ThinkIac/github.

## Uso no ThinkIac

Este pacote foi extraído de `packages/github`. Preserve a identidade `github` do manifest ao instalá-lo em um workspace Lógos. Views, rotas, ferramentas e hooks são descobertos pelo runtime e dependem dos provedores correspondentes. Esta extração publica o código atual; não converte JavaScript para LógosType nem implementa instalação por perfil.

Entrada declarada: `index.js`.

## Dependências e validação

Dependências declaradas: `logos`.

O pacote não declara scripts npm de build/teste. Os testes existentes acompanham o fonte; a composição completa requer o host ThinkIac.

## Segurança e dados locais

Credenciais devem ser configuradas no ambiente de destino. Não acompanham esta extração bancos, sessões, uploads, perfis pessoais, arquivos `.env`, caches ou backups. As exclusões foram registradas em relatório externo à publicação. Configure segredos pelo host, sem incluí-los em commits.

## Documentação anterior

# GitHub Tools

O pacote oferece Tools para repositórios, branches, Git por SSH, Issues e Pull Requests. A tela GitHub em **Settings → Chaves de integrações** mostra a chave pública SSH, recebe o Personal Access Token e configura nome/e-mail dos commits.

Cadastre a chave pública exibida no GitHub em **Settings → SSH and GPG keys**. O token é necessário para operações da API; a chave SSH é usada para clonar, puxar e enviar commits. O token e a chave privada são gravados em `packages/github/.private/settings.json` com permissão `0600`; clones e chave SSH do host ficam no mesmo diretório privado.

Push e Pull trabalham apenas em clones criados pela Tool `github_clone_repository`, dentro de `.private/repos/`. Push adiciona alterações rastreadas e não rastreadas, cria commit se necessário e envia a branch indicada ou a atual. Pull usa fast-forward e falha se houver divergência que exija merge manual. O host precisa ter `git` e `ssh` instalados.

## Registros encontrados no código

- `router`: `settings`, `system/action`, `system/view`.
- `tool`: `github_clone_repository`, `github_comment_issue`, `github_comment_pull_request`, `github_create_branch`, `github_create_issue`, `github_create_local_branch`, `github_create_pull_request`, `github_create_repository`, `github_edit_repository`, `github_generate_ssh_key`, `github_list_branches`, `github_list_issues`, `github_list_local_branches`, `github_list_pull_requests`, `github_list_repositories`, `github_pull`, `github_push`, `github_set_git_identity`.

A lista é um inventário estático e pode incluir registros em testes; não garante disponibilidade sem os provedores do host.

