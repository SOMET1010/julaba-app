<#
    Remplir le catalogue d'un compte marchand DE TEST - version Windows.

    POURQUOI CE FICHIER. Le script .sh equivalent ne s'execute pas dans
    PowerShell, et Patrick travaille sous Windows. Meme travail, meme API.

    POURQUOI CE SCRIPT EXISTE TOUT COURT. Le 17/09/2026, le compte de test ne
    contenait qu'UN produit - " oignon ", 0 restants. Toute vente vocale se
    rabattait dessus, et on ne pouvait plus distinguer un defaut de
    RECONNAISSANCE d'un simple effet de catalogue vide. Un catalogue d'un seul
    produit ne prouve rien : il donne toujours la meme reponse.

    LES PRODUITS CHOISIS SONT TOUS DANS LE VOCABULAIRE VOCAL EMBARQUE
    (frontend_src/src/app/voice-offline/vocabulaire.ts, liste PRODUITS). C'est
    la condition pour que le test ait un sens : dicter un produit que
    l'application ne connait pas n'eprouve que le repli, pas la reconnaissance.

    Les prix sont des ordres de grandeur de marche abidjanais, a ajuster : ce
    sont des valeurs d'essai, pas une verite de terrain.

    CE SCRIPT ECRIT DANS LA BASE DE PRODUCTION. A n'utiliser que sur un compte
    de TEST, jamais sur le compte d'une vraie marchande.

    USAGE, dans PowerShell, n'importe ou :
        .\seed-catalogue-test.ps1 -Numero "+2250700000000" -Code "1234"
#>

param(
    [Parameter(Mandatory = $true)][string]$Numero,
    [Parameter(Mandatory = $true)][string]$Code,
    [string]$Api = 'https://julaba-api.onrender.com/api/v1'
)

$ErrorActionPreference = 'Continue'

Write-Host "-- Connexion a $Api --"
$corpsLogin = @{ phone = $Numero; password = $Code } | ConvertTo-Json -Compress
try {
    $reponse = Invoke-RestMethod -Uri "$Api/auth/login" -Method Post `
        -ContentType 'application/json' -Body $corpsLogin
}
catch {
    Write-Host "Connexion refusee. Verifie le numero et le code." -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
    exit 1
}

$jeton = $reponse.accessToken
if ([string]::IsNullOrWhiteSpace($jeton)) {
    Write-Host "Pas de jeton dans la reponse - connexion incomplete." -ForegroundColor Red
    exit 1
}
Write-Host "  connectee" -ForegroundColor Green

# nom | stock | prix de vente | prix d'achat | unite | categorie
$produits = @(
    @{ nom = 'Tomate';  stock = 20; prix = 500; achat = 350; unite = 'kg';       cat = 'Legumes'  },
    @{ nom = 'Banane';  stock = 40; prix = 100; achat =  60; unite = 'piece';    cat = 'Fruits'   },
    @{ nom = 'Riz';     stock = 50; prix = 600; achat = 500; unite = 'kg';       cat = 'Cereales' },
    @{ nom = 'Attieke'; stock = 30; prix = 200; achat = 125; unite = 'portion';  cat = 'Autre'    },
    @{ nom = 'Piment';  stock = 15; prix = 150; achat = 100; unite = 'tas';      cat = 'Legumes'  }
)

Write-Host ("-- Ajout de {0} produits --" -f $produits.Count)
$entetes = @{ Authorization = "Bearer $jeton" }
$ajoutes = 0

foreach ($p in $produits) {
    $corps = @{
        nom          = $p.nom
        quantite     = $p.stock
        prix         = $p.prix
        prix_achat   = $p.achat
        unite        = $p.unite
        categorie    = $p.cat
        seuil_alerte = 5
    } | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri "$Api/stocks" -Method Post -Headers $entetes `
            -ContentType 'application/json' -Body $corps | Out-Null
        Write-Host ("  ok  {0} - {1} F/{2}, {3} en stock" -f $p.nom, $p.prix, $p.unite, $p.stock) -ForegroundColor Green
        $ajoutes++
    }
    catch {
        Write-Host ("  echec {0} : {1}" -f $p.nom, $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ("{0} / {1} produits ajoutes." -f $ajoutes, $produits.Count)
Write-Host ""
Write-Host "Rouvre " Caisse du jour " : chaque produit doit avoir sa propre image."
Write-Host ""
Write-Host "Le test qui compte, maintenant :" -ForegroundColor Cyan
Write-Host "  bouton VERT de Tata -> " j'ai vendu trois tomates a cinq cents francs ""
Write-Host "  puis releve ce qui est ecrit dans " TU AS DIT ", mot pour mot."
