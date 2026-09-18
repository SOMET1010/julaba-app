<#
    Supprimer les branches dont le travail est deja dans main - version Windows.

    POURQUOI CE FICHIER EXISTE. La passerelle git des sessions d'assistant
    refuse toute suppression de reference (HTTP 403, verifie trois fois). Le
    droit de supprimer est du cote de Patrick. Comme il travaille sous Windows
    et que PowerShell n'execute pas un .sh, voici la meme operation en natif.

    IL N'A BESOIN D'AUCUN DEPOT CLONE. Le script fait lui-meme un clone nu et
    allege (sans le contenu des fichiers, quelques secondes) dans un dossier
    temporaire, verifie, supprime, puis efface le dossier.

    CE QU'IL VERIFIE AVANT DE SUPPRIMER. Chaque branche doit pointer exactement
    sur le commit mesure le 18/09/2026. Si quelqu'un a pousse depuis, ce qu'elle
    porte de nouveau n'a ete verifie par personne : le script ne la touche pas
    et le dit.

    RIEN N'EST IRRECUPERABLE. Chaque SHA est ecrit ci-dessous et archive dans
    docs/BRANCHES-SUPPRIMEES-2026-09-17.md. Restaurer une branche :
        git push origin <sha>:refs/heads/<nom>

    NE SONT PAS TOUCHEES : main, dev, claude/clever-allen-dnr8by.

    USAGE, dans PowerShell, n'importe ou :
        .\supprimer-branches-fusionnees.ps1              # montre, ne supprime rien
        .\supprimer-branches-fusionnees.ps1 -Appliquer    # supprime pour de bon
#>

param([switch]$Appliquer)

$ErrorActionPreference = 'Continue'
$DepotUrl = 'https://github.com/SOMET1010/julaba-app.git'

# Nom de branche suivi du commit mesure le 18/09/2026.
$Branches = @(
  'claude/accents-autres-roles 35dd96a868e24f0071cfff7dadeef961b091a1ea'
  'claude/accents-coeur-cible faec7378373135d0071d0dcb5382794350854b59'
  'claude/accueil-titre-marge 36b32492eec3ea654b2171f54fdb9213255afc88'
  'claude/accueil-tuiles-locales 3c55410d9023cbb33243f8aa19aa2ca0bdabbeaf'
  'claude/anonymisation-complete 97f3099e2e0a0cae98f0f586a80091c09c75b5c4'
  'claude/api-url-backoffice baeb78411d8a769c17e2d43ee3c2d3446e5694dc'
  'claude/api-url-objectifs-raccourcis 2015c34ad54222a3e24b3a4197d35da07ecae537'
  'claude/audit-ui-code 16d68d430a2f84d38e939992e8214a591ab43e63'
  'claude/backlog-2026-08 50541278c1eeae6bf2c4702d8f06799827af7261'
  'claude/backlog-a-jour 39bc64c416c134d6bd4c363476d9ee86e5d02cb7'
  'claude/blocage-wallet-reel 16902189a5a4486cbbcfa9f70958f735387ddd2a'
  'claude/bo-communication-reelle 43ca8a5f606651e23bd7c1a9831be6b1c5487f6f'
  'claude/bo-cron-reel 59807fd8f23f2a915b26e2135ec2ff6bb6409c5c'
  'claude/bo-monitoring-ia-reel 993a971e2f6a142d5ccf9bd24812cc36b3104da0'
  'claude/bo-parametres-voix e53b2304220dea9790d8293f74d0d5458b4a9c3e'
  'claude/bo-rapports-pdf-reels 4591cadc3437870bc2f55713a841a55d63dfe31a'
  'claude/caisse-plus-cercle 6a6da79da3f16669d62d27d56a7b3d3b5f4de274'
  'claude/caisse-plus-contraste fb194ccdc4c12624e805eb68b503c32565db3a96'
  'claude/cap-azure fab810507824d0eda23b02edaa6c5525aeaefce3'
  'claude/clavier-image b162d895224fa86a7d08d687344be51fe35a6762'
  'claude/cloche-44 b05834e26e5f97a4c1a60ef23754ecb1a2833b70'
  'claude/cnps-cnam-backend 360ce162ca02655641fc74bb5f91aed09f904d8a'
  'claude/commande-negociation-lien dce65362bb26950884b0c99ae58e5e6a41544692'
  'claude/coop-inbox-partagee 21a0076f48dde0dec334230b11106ce5eac2b180'
  'claude/dates-jour-local f24981760eeabf0198838fc64a7427440eb6453e'
  'claude/decisions-entree 948e8588f48ff0eaaaa2b87c2d401c29fd82df2b'
  'claude/durcir-confirm-suppression 6848b07e3350770edea2c9684af668e93ca87007'
  'claude/ecran-activation 04e665bf324c84f932ec25cf48129bb119707235'
  'claude/entete-retour-tactile 5d3708fcb6057ba38a5fb89d0a534e67f67ade88'
  'claude/fiche-cibles-tactiles a699ec474f502b50cbddc584e09ebee9a9fe4516'
  'claude/fidelite-paiement-recompenses 3a61bae97371b2086c5517dd75e57953cc43cefc'
  'claude/fix-acces-marchand-stock-commun 22f2d5cb1a30582bd88a621560a98c1925244fbe'
  'claude/fix-activation-critique 42fa3c6d5d991f68d61d4cbcb1d34e9869096cfb'
  'claude/fix-annulation-en-cours fe9c5ab0bb500978c291a419f99613142c118bfb'
  'claude/fix-audio-unlock-onboarding a4317984525f7e3c31241ca3da9b826f1e586c7f'
  'claude/fix-bo-cross-domain-auth-token 434a4d0920c50c33b89d32ed312f504c2fc29288'
  'claude/fix-change-password-bo-role 87f6277f5e5434a9af744e7cdd3d4ee4fd9fc240'
  'claude/fix-cooperatives-liste-500 b1b8415d108d7fe9ac0b97e70c4c6e4935b95727'
  'claude/fix-cosmetique-annulee-credits 1e020e5e1feb7e680d366447aa7aefbcad032e07'
  'claude/fix-distribution-stock-commun-visible 1fdb117fa25bbfa72377f689a994e9dd888f3a1c'
  'claude/fix-flakiness-m6-m8 81731c7d2f3d06047ae377faa24f4d80a8081e4f'
  'claude/fix-icone-apk-android c046d91f0fb2ee6eadeb34e9f930a28a8a42379a'
  'claude/fix-marche-zone-creation 0b1fe7d06d758e51d68328ab4a0ded096291b38d'
  'claude/fix-nom-tata-nanti-lou 5f2c01c9da381e73e7ad1da6a856c099fa68fa07'
  'claude/fix-notif-caisse-obsolete e21dfb217f79c80c8884323252a94048428e5e07'
  'claude/fix-passwordhash-leak-residuel c50514af3af9096049eb4fe06c399d31e2e90f41'
  'claude/fix-phone-collision-ps-tontine 2f36bf622df52c0394128ccb9c626b96dba9abb9'
  'claude/fix-prix-achat-marge 122847d49304b882e09a532d4489e0f6c07f3da1'
  'claude/fix-reappro-tronque 1d044b00035009c460acf4118dd7b5297e86e29b'
  'claude/fix-recolte-prix-unite 12386b06074b5c62e82316af07eeab2ecc879112'
  'claude/fix-reset-password-mechanism cddda8644573705579ee30c57f0df06385d33024'
  'claude/fix-seed-demo-password-coherence aebb754da560e3eaa6969205090bcf603dd31516'
  'claude/fix-suppression-stock 444e057aef745be220a337e90ecc5157b85d196c'
  'claude/fix-tresorerie-stocks-500 88862790ca463302d2965f5c0d12c3d6f2965876'
  'claude/fix-verite-argent-caisse 670f05206dd922fb2befa003f3e2a9c944dee4e0'
  'claude/fix-webdir-capacitor aebcfef47fa4d89a1a312856944e659606cda1bf'
  'claude/fuite-passwordhash-membres c6103a36feeffa0dfd3827f732ae276ab6ccba49'
  'claude/guidage-vocal-auto 2b0e761fa41ae1555d5e7796240fce3408cc31cd'
  'claude/hygiene-voix c106964c935ea6d8d480fd3479adbcf26e12092e'
  'claude/hygiene-voix-canaux 85ec12d5fc273b57259a4b2a0188a3e1a669a60e'
  'claude/inbox-negociation-producteur 860f29570a0c11a29f9844f975ed2842883e35f0'
  'claude/institution-isolation-donnees ef2012da7b2621e8194926ca192877ddbd54f0ea'
  'claude/invariants-readiness 2f5b7a49c7762da5b4128560a56672f5f7bec3af'
  'claude/julaba-conversation-6zfdaz 24045db1a63b40027722fb3b83091a64e9533ec8'
  'claude/julaba-voice-audit-fixes-hi3jlq 1d7f01b9fe430286d3633ce4ee2602309515b0d0'
  'claude/keiwa-paiement-e2e bd1c98616b07eec07ff451474ea1f4671b8eaf4a'
  'claude/keiwa-transfert-comptes 571274d79ba2e0cf98ab619bf32b6d721e6ae4e3'
  'claude/microcredit-palier-reel db266e50ef1df1f2cedbbd058ce4e7d8a9779ed4'
  'claude/migration-gps-communes 7cae8a6d5b6cf02e453c2b92ea6f0a3babf9d46c'
  'claude/mouvements-produit f63dcb8200fa5b119e629f7af06aefceef9e379f'
  'claude/mutations-zone-reelles e2f6fa25b7eae305487ee3238b525d6064293e95'
  'claude/negociation-contre-offre 715d084aecbfad3bc02d881b05f71b78740c1bef'
  'claude/negociation-reservation-stock 96c4647e6ea0b3f415146ad7b2ec2bc65a88fb30'
  'claude/nettoyage-clips-voix a3882b07b177c1265d8e7f08d3ea0e044c04db8b'
  'claude/p0-activation aa1eee5d9eb66bc5c1989c4c463435c4634053df'
  'claude/packs-voix d11f5cf72f974eefcc82a83f12b073630019c397'
  'claude/protocole-pilote 604582bfaa9ab1f57aef888543e7ee365fbc067b'
  'claude/raccourcis-rapport-montage bb64b46f5c3d37642e72dd389417c17f53440283'
  'claude/raccourcis-validation 9373c6703b32e0da1849178e50adec9aa0b692d0'
  'claude/readiness-pilote 35186d2f7a6093a5c004235636d180972e27f745'
  'claude/recu-sans-pdf 2c10c7f589711153bd1631e9d6fcdf9a85fbf57a'
  'claude/routeur-intentions 5f99c7121d1a8455876cd1e18cfa95d25d34d13a'
  'claude/sauvegarde-auto 0728b63de612a68adcf1c837627aeae78ff15f83'
  'claude/score-membres-cooperative 1791450e3dd3505c6e0ff3ff158ee61f53172e29'
  'claude/session-ticgbm 4b32fbc9b777d79c6fad85663f5201259f6845d9'
  'claude/sherpa-onnx-apk 90054344cd2b478218516d0ec2b36da8d96867be'
  'claude/skill-identifier-acteur 8255209b3c3f487848a7e52b532c0d955bafe046'
  'claude/stock-commun-cooperative 3bbeb00847f88e71dd2b439af8bb90a19ef60eac'
  'claude/studio-v1-collecte d3dc3ed3f4d7f19ef8e1e4a4fb06c8536fc19f59'
  'claude/studio-voix 6ff229fd635d0084c359572aff500b65348fa4d4'
  'claude/suppression-cible-exacte ebde4a8f62f529bcda54b90b01fa67243d4dfeb9'
  'claude/suppression-modale-fiable 77598bcd311241240cbf584bcd97443a6cd087e3'
  'claude/tontine-reelle 8bd5b752ae76351c8c8e589e71fb1d3123697260'
  'claude/unify-unites 4333076f29bed597535584b0b82c1059c0b52cf2'
  'claude/ux-creation-produit 49eb5cf7008204220adbd98a35f5792c7e55fa2d'
  'claude/vente-guidee-catalogue e1d680897f23cbf5d009790d6752f500eb555a5a'
  'claude/vente-guidee-confirmation daf5fbae2b8aa9452145335e55e73c0bbdf8bbc0'
  'claude/vente-guidee-grammaire 9f09cf169da8d0bb4eee13d21e76471bb8697ffe'
  'claude/vente-guidee-ligne-provisoire 2868c7d19d2359a2cc2ce7e3def701979522574f'
  'claude/ventes-filtre-voix b00b3886b4e4cf86b7fae2f1b63116a43177c44e'
  'claude/verrou-parole-ecoute 7de70a083d124e7217a1ebb46929743d9c007211'
  'claude/voix-code-mort c01c5da59d9ed861b78461ae8eae644261f3dedb'
  'claude/voix-first-activation f955644aa0d5947183e2d720ebd5dab2f77579aa'
  'claude/voix-first-numero 6dc84f467ad54d8b37e9daea1e9419e8fa55be22'
)

# --- Git est-il la ? -------------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git n'est pas installe (ou pas dans le PATH)." -ForegroundColor Red
    Write-Host "Installe-le depuis https://git-scm.com/download/win puis rouvre PowerShell."
    exit 1
}

# --- Clone nu et allege dans un dossier temporaire -------------------------
$Travail = Join-Path $env:TEMP ("julaba-menage-" + [guid]::NewGuid().ToString('N').Substring(0,8))
Write-Host "-- Recuperation des references (quelques secondes) --"
git clone --bare --filter=blob:none --quiet $DepotUrl $Travail
if ($LASTEXITCODE -ne 0) {
    # --filter demande Git 2.19+. Sur une version plus ancienne, on recommence
    # sans, c'est juste plus long a telecharger.
    Write-Host "  (clone allege indisponible, on prend le chemin classique)"
    Remove-Item -Recurse -Force $Travail -ErrorAction SilentlyContinue
    git clone --bare --quiet $DepotUrl $Travail
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "Le clone a echoue. Verifie ta connexion et ton acces au depot." -ForegroundColor Red
    exit 1
}

try {
    $sures     = New-Object System.Collections.Generic.List[string]
    $douteuses = New-Object System.Collections.Generic.List[string]
    $absentes  = New-Object System.Collections.Generic.List[string]

    foreach ($entree in $Branches) {
        $morceaux = $entree.Split(' ')
        $nom = $morceaux[0]
        $shaAttendu = $morceaux[1]

        $shaActuel = git -C $Travail rev-parse --verify --quiet "refs/heads/$nom" 2>$null
        if ([string]::IsNullOrWhiteSpace($shaActuel)) {
            $absentes.Add($nom)
        }
        elseif ($shaActuel.Trim() -eq $shaAttendu) {
            $sures.Add($nom)
        }
        else {
            $douteuses.Add("$nom (poussee depuis la verification)")
        }
    }

    Write-Host ""
    Write-Host "-- Mesure --"
    Write-Host ("  {0} branches supprimables" -f $sures.Count)
    Write-Host ("  {0} branches douteuses -> CONSERVEES" -f $douteuses.Count)
    Write-Host ("  {0} deja absentes du depot" -f $absentes.Count)
    Write-Host ""

    if ($douteuses.Count -gt 0) {
        Write-Host "Non touchees :" -ForegroundColor Yellow
        foreach ($d in $douteuses) { Write-Host "    $d" }
        Write-Host ""
    }

    if ($sures.Count -eq 0) {
        Write-Host "Rien a supprimer."
        exit 0
    }

    if (-not $Appliquer) {
        Write-Host "Essai a blanc - rien n'a ete supprime." -ForegroundColor Cyan
        Write-Host "Pour supprimer pour de bon, relance avec -Appliquer"
        exit 0
    }

    # --- Suppression, par paquets de 20 ------------------------------------
    # Une seule commande pour 104 branches depasse souvent la limite du
    # serveur, et un echec en milieu de liste laisse un etat flou.
    Write-Host ("-- Suppression de {0} branches --" -f $sures.Count)
    $tableau = $sures.ToArray()
    $faites = 0
    for ($i = 0; $i -lt $sures.Count; $i += 20) {
        $fin = [Math]::Min($i + 19, $tableau.Count - 1)
        $lot = $tableau[$i..$fin]
        git -C $Travail push origin --delete $lot
        if ($LASTEXITCODE -eq 0) {
            $faites += $lot.Count
            Write-Host ("  ok : {0} branches" -f $lot.Count) -ForegroundColor Green
        }
        else {
            Write-Host ("  echec sur ce lot : {0}" -f ($lot -join ', ')) -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host ("{0} / {1} branches supprimees." -f $faites, $sures.Count)
    $restantes = (git ls-remote --heads $DepotUrl | Measure-Object -Line).Lines
    Write-Host ("Il reste {0} branches sur le depot." -f $restantes)
}
finally {
    Remove-Item -Recurse -Force $Travail -ErrorAction SilentlyContinue
}
