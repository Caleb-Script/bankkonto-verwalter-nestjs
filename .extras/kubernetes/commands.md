kubectl delete namespace bankkonto-namespace
kubectl delete persistentvolume postgres-pv-data
kubectl delete persistentvolume postgres-pv-tablespace
kubectl delete persistentvolume postgres-pv-csv
kubectl delete persistentvolume postgres-pv-sql
kubectl delete persistentvolume postgres-pv-config
kubectl delete persistentvolume postgres-certs-pv
kubectl delete persistentvolume pgadmin-pv
kubectl delete persistentvolume pgadmin4-pv
kubectl delete persistentvolume kc-data-pv

kubectl apply -f ./persistent-volumes/ --namespace=bankkonto-namespace
kubectl apply -f ./namespace.yml --namespace=bankkonto-namespace
kubectl apply -f ./postgres --namespace=bankkonto-namespace
kubectl apply -f ./keycloak --namespace=bankkonto-namespace
kubectl apply -f ./pgadmin --namespace=bankkonto-namespace
kubectl apply -f ./bankkonto --namespace=bankkonto-namespace


kubectl apply - R -f . --namespace=bankkonto-namespace

# Verification: Run the following to check if an external IP has been assigned:
kubectl get svc -n bankkonto-namespace

kubectl get pv --namespace=bankkonto-namespace
kubectl get pvc --namespace=bankkonto-namespace

helm uninstall ngrok-ingress-controller --namespace bankkonto-namespace
helm install ngrok-ingress-controller ngrok/kubernetes-ingress-controller --namespace bankkonto-namespace --create-namespace --set credentials.apiKey=$env:NGROK_API_KEY --set credentials.authtoken=$env:NGROK_AUTHTOKEN


kubectl delete ingress bankkonto-ingress -n bankkonto-namespace

kubectl config view --raw > ~/.kube/config
