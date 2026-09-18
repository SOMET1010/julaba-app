<#
    Supprimer les branches dont le travail est deja dans main - version Windows.

    POURQUOI CE FICHIER EXISTE. La passerelle git des sessions d'assistant
    refuse toute suppression de reference (HTTP 403, verifie trois fois). Le
    droit de supprimer est du cote de Patrick. Comme il travaille sous Windows
    et que PowerShell n'execute pas un .sh, voici la meme operation en natif.

    IL N'A BESOIN D'AUCUN DEPOT CLONE. Le script fait lui-meme un clone nu et
    allege (sans le contenu des fichiers, quelques secondes) dans un dossier
    temporaire, verifie, supprime, puis efface le dossier.

    DEUXIEME PASSAGE, 18/09 au soir. Les 104 premieres sont supprimees. Il
    restait 25 branches qui n'etaient pas dans la mesure du 17/09 (des
    review/*, audit/*, design/* et quelques claude/*). Mesurees a leur tour :
    toutes les 25 sont des ANCETRES DIRECTS de main, preuve mecanique, aucun
    doute possible. C'est cette liste-la que le script porte maintenant.

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
  'audit/security-dependencies bc0d334c0df4eebcf3ee4cf7cb7ebc71d3261e10'
  'claude/consolidation-tuiles-marchand 2a45c2a9ff8877deeff0134419be154b43892248'
  'claude/doc-voice-omnilingual-asr c095f9bf6ddf4be3d7367b541ba99c0e48f8b03c'
  'claude/odoo-19-pos-setup-dy3zam 7c5fd12a72c968dabcf1bd8638c88e257c8bc1de'
  'claude/odoo-gateway-devise-xof 9a938f603c73e3c067d9793637d809717edca93d'
  'claude/reorg-accueil-profil-marchand 30f172e2fa952f018baa53b63e6c84bf03c2897b'
  'claude/studio-voix-script-connexion 3e40ed0357c4aae887457ddfd0b8877f4761828d'
  'design/esprit-du-marche ea88071ac97151284ae3e6eb965e773ce3aa9e37'
  'review/lot-a-offline-integrity 6fe50c4f84dcf6b7ecffde39cb3d2d169e6ecb6c'
  'review/odoo-filtre-catalogue-sale-ok 9d51e9aa7944784fa246f64ed603d333fd512aa5'
  'review/odoo-gateway-filtre-is-storable 865afde5f227b85c7d4f8e78c8482f511d8f8bae'
  'review/odoo-gateway-poc 53499d79af462516966516b2fd0ed84887db75e7'
  'review/odoo-poc-backend-reel aad2c178748d7253ad61e39b193799755f495143'
  'review/odoo-poc-xof-vivrier-seed 7d06e365e8a1111a9fd420eb625aabf717240c0c'
  'review/odoo-real-client-read-only d2c6621dd220568b56f9b4a9306b9ca010abd7c0'
  'review/odoo-smoke-test-sale-ok-check c4cd72a2a8260376db6e5a0bc347854dcc04f73d'
  'review/offline-voice-queue-clearqueue-fix 85b7b4b88b0fc623f188aab22c4be81a876ffc17'
  'review/pilote2-bascule-compte-reelle 1100a52422810c3d3ec7506b2b04d4cac130eae9'
  'review/pilote3-miroir-catalogue 008b4c289c23a3c83d55150d2059b0cb8b77e41e'
  'review/porte-android-url-api 3a0b90ae961927a752777df12df123feb306061c'
  'review/pos-voice-close-tata-parallel-path 2036bcc4abe53ee52d295497c4f1283e4393d703'
  'review/pos-voice-lot1-extract 6b24af19c581e2340a247295c90a6f63eb736f46'
  'review/pos-voice-lot2-cart-only 59b5652b96a52f60fada7ef95865c1aa4349c958'
  'review/recette-pilote2-offline a355d1d0db6733851d9c602bddaf38d7b8afcc8a'
  'review/referentiel-maitre-198 b2c8035800f779b66000b8f697d4c0cf70761907'
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
