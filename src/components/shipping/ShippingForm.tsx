import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Truck, 
  Package, 
  Clock, 
  Shield, 
  MapPin, 
  Calculator 
} from 'lucide-react';
import { 
  getShippingMethods, 
  calculateShippingCost, 
  createShipment,
  type ShippingMethod 
} from '@/services/shippingService';
import { useToast } from '@/hooks/use-toast';

interface ShippingFormProps {
  tradeId: string;
  senderUserId: string;
  recipientUserId: string;
  onShipmentCreated: (shipment: any) => void;
}

interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

const ShippingForm = ({ tradeId, senderUserId, recipientUserId, onShipmentCreated }: ShippingFormProps) => {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [weight, setWeight] = useState<number>(0.1);
  const [dimensions, setDimensions] = useState('');
  const [insuranceValue, setInsuranceValue] = useState<number>(0);
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [senderAddress, setSenderAddress] = useState<Address>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: 'GB'
  });

  const [recipientAddress, setRecipientAddress] = useState<Address>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: 'GB'
  });

  useEffect(() => {
    loadShippingMethods();
  }, []);

  useEffect(() => {
    if (selectedMethod && weight > 0) {
      calculateCost();
    }
  }, [selectedMethod, weight, recipientAddress.country]);

  const loadShippingMethods = async () => {
    try {
      const methods = await getShippingMethods(true);
      setShippingMethods(methods);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading shipping methods",
        description: "Please try again later."
      });
    }
  };

  const calculateCost = async () => {
    if (!selectedMethod || weight <= 0) return;

    try {
      const cost = await calculateShippingCost(selectedMethod, recipientAddress.country, weight);
      setCalculatedCost(cost);
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedMethod || !senderAddress.name || !recipientAddress.name) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields."
      });
      return;
    }

    setLoading(true);
    try {
      const shipment = await createShipment({
        trade_id: tradeId,
        shipping_method_id: selectedMethod,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        shipping_cost: calculatedCost,
        insurance_value: insuranceValue,
        weight_kg: weight,
        dimensions_cm: dimensions,
        sender_address: senderAddress,
        recipient_address: recipientAddress,
        status: 'pending'
      });

      onShipmentCreated(shipment);
      
      toast({
        title: "Shipment created",
        description: "Your shipping details have been saved successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating shipment",
        description: "Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodData = shippingMethods.find(m => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      {/* Shipping Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipping Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shippingMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedMethod === method.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{method.name}</h4>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {method.estimated_delivery_days} days
                      </div>
                      {method.tracking_included && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Tracked
                        </div>
                      )}
                      {method.insurance_included && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Insured
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">£{method.base_price.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">base price</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Package Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Package Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0.1)}
              />
            </div>
            <div>
              <Label htmlFor="dimensions">Dimensions (L x W x H cm)</Label>
              <Input
                id="dimensions"
                placeholder="e.g. 20 x 15 x 5"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="insurance">Insurance Value (£)</Label>
              <Input
                id="insurance"
                type="number"
                step="0.01"
                min="0"
                value={insuranceValue}
                onChange={(e) => setInsuranceValue(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {selectedMethodData && calculatedCost > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{selectedMethodData.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {weight}kg package to {recipientAddress.country}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">£{calculatedCost.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">total cost</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sender Address */}
        <Card>
          <CardHeader>
            <CardTitle>Sender Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="sender-name">Full Name</Label>
              <Input
                id="sender-name"
                value={senderAddress.name}
                onChange={(e) => setSenderAddress(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="sender-line1">Address Line 1</Label>
              <Input
                id="sender-line1"
                value={senderAddress.line1}
                onChange={(e) => setSenderAddress(prev => ({ ...prev, line1: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="sender-line2">Address Line 2 (Optional)</Label>
              <Input
                id="sender-line2"
                value={senderAddress.line2}
                onChange={(e) => setSenderAddress(prev => ({ ...prev, line2: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sender-city">City</Label>
                <Input
                  id="sender-city"
                  value={senderAddress.city}
                  onChange={(e) => setSenderAddress(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sender-postcode">Postcode</Label>
                <Input
                  id="sender-postcode"
                  value={senderAddress.postcode}
                  onChange={(e) => setSenderAddress(prev => ({ ...prev, postcode: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Address */}
        <Card>
          <CardHeader>
            <CardTitle>Recipient Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="recipient-name">Full Name</Label>
              <Input
                id="recipient-name"
                value={recipientAddress.name}
                onChange={(e) => setRecipientAddress(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="recipient-line1">Address Line 1</Label>
              <Input
                id="recipient-line1"
                value={recipientAddress.line1}
                onChange={(e) => setRecipientAddress(prev => ({ ...prev, line1: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="recipient-line2">Address Line 2 (Optional)</Label>
              <Input
                id="recipient-line2"
                value={recipientAddress.line2}
                onChange={(e) => setRecipientAddress(prev => ({ ...prev, line2: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="recipient-city">City</Label>
                <Input
                  id="recipient-city"
                  value={recipientAddress.city}
                  onChange={(e) => setRecipientAddress(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="recipient-postcode">Postcode</Label>
                <Input
                  id="recipient-postcode"
                  value={recipientAddress.postcode}
                  onChange={(e) => setRecipientAddress(prev => ({ ...prev, postcode: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Shipment */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleCreateShipment}
            disabled={loading || !selectedMethod || !senderAddress.name || !recipientAddress.name}
            className="w-full"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating Shipment...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Create Shipment - £{calculatedCost.toFixed(2)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingForm;